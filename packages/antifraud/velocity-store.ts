// LEGEND: Velocity store — tracks session frequency per key (email, IP, device) in time windows
// Pluggable storage: in-memory default, swap for Redis/KV in production
// All usage must comply with this LEGEND and the LICENSE

import { kv } from "@vercel/kv";
import { getIsoTimestamp, getIsoTimestampFromUnix } from "../../utils/stamp";
import {
  VELOCITY_MAX_SESSIONS_PER_DEVICE,
  VELOCITY_MAX_SESSIONS_PER_EMAIL,
  VELOCITY_MAX_SESSIONS_PER_IP,
  VELOCITY_WINDOW_MS,
} from "./constants";
import type { VelocityRecord } from "./schemas";

/* ── Velocity Storage Interface ──────────────────────────── */

export interface VelocityStorage {
  /** Record a session for a given key */
  record(params: { key: string; key_type: VelocityRecord["key_type"]; session_id: string }): Promise<void>;
  /** Get current velocity record for a key within the active window */
  get(params: { key: string; key_type: VelocityRecord["key_type"] }): Promise<VelocityRecord | null>;
  /** Prune expired entries */
  prune(): Promise<number>;
}

/* ── In-Memory Velocity Storage ──────────────────────────── */

interface InMemoryEntry {
  key: string;
  key_type: VelocityRecord["key_type"];
  session_ids: string[];
  timestamps: number[];
}

export class InMemoryVelocityStorage implements VelocityStorage {
  private store = new Map<string, InMemoryEntry>();
  private windowMs: number;

  constructor(params: { windowMs?: number } = {}) {
    this.windowMs = params.windowMs ?? VELOCITY_WINDOW_MS;
  }

  private storeKey(params: { key: string; key_type: string }): string {
    return `${params.key_type}:${params.key}`;
  }

  async record(params: { key: string; key_type: VelocityRecord["key_type"]; session_id: string }): Promise<void> {
    const sk = this.storeKey({ key: params.key, key_type: params.key_type });
    const now = Date.now();

    let entry = this.store.get(sk);
    if (!entry) {
      entry = {
        key: params.key,
        key_type: params.key_type,
        session_ids: [],
        timestamps: [],
      };
      this.store.set(sk, entry);
    }

    // Avoid duplicate session recording
    if (!entry.session_ids.includes(params.session_id)) {
      entry.session_ids.push(params.session_id);
      entry.timestamps.push(now);
    }

    // Evict entries outside window
    const cutoff = now - this.windowMs;
    const validIndices = entry.timestamps
      .map((t, i) => (t >= cutoff ? i : -1))
      .filter((i) => i >= 0);
    entry.session_ids = validIndices.map((i) => entry!.session_ids[i]);
    entry.timestamps = validIndices.map((i) => entry!.timestamps[i]);
  }

  async get(params: { key: string; key_type: VelocityRecord["key_type"] }): Promise<VelocityRecord | null> {
    const sk = this.storeKey({ key: params.key, key_type: params.key_type });
    const entry = this.store.get(sk);
    if (!entry || entry.session_ids.length === 0) return null;

    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Filter to active window
    const validIndices = entry.timestamps
      .map((t, i) => (t >= cutoff ? i : -1))
      .filter((i) => i >= 0);

    if (validIndices.length === 0) return null;

    const activeSessions = validIndices.map((i) => entry.session_ids[i]);
    const activeTimestamps = validIndices.map((i) => entry.timestamps[i]);

    return {
      key: params.key,
      key_type: params.key_type,
      session_ids: activeSessions,
      window_start: new Date(Math.min(...activeTimestamps)).toISOString(),
      window_end: getIsoTimestamp(),
      count: activeSessions.length,
    };
  }

  async prune(): Promise<number> {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    let pruned = 0;

    for (const [sk, entry] of this.store.entries()) {
      const validIndices = entry.timestamps
        .map((t, i) => (t >= cutoff ? i : -1))
        .filter((i) => i >= 0);

      if (validIndices.length === 0) {
        this.store.delete(sk);
        pruned++;
      } else {
        const removed = entry.session_ids.length - validIndices.length;
        entry.session_ids = validIndices.map((i) => entry.session_ids[i]);
        entry.timestamps = validIndices.map((i) => entry.timestamps[i]);
        pruned += removed;
      }
    }

    return pruned;
  }
}

/* ── Vercel KV Velocity Storage (persistent) ────────────── */

interface KvVelocityEntry {
  session_id: string;
  timestamp_ms: number;
}

export class VercelKvVelocityStorage implements VelocityStorage {
  private windowMs: number;

  constructor(params: { windowMs?: number } = {}) {
    this.windowMs = params.windowMs ?? VELOCITY_WINDOW_MS;
  }

  private storeKey(params: { key: string; key_type: string }): string {
    return `ucp:antifraud:velocity:${params.key_type}:${params.key}`;
  }

  private getNowMs(): number {
    return Date.parse(getIsoTimestamp());
  }

  private parseEntries(entries: unknown[]): KvVelocityEntry[] {
    const parsed: KvVelocityEntry[] = [];
    for (const entry of entries) {
      if (typeof entry !== "string") {
        continue;
      }
      try {
        const value = JSON.parse(entry) as KvVelocityEntry;
        if (
          value &&
          typeof value.session_id === "string" &&
          typeof value.timestamp_ms === "number"
        ) {
          parsed.push(value);
        }
      } catch {
        continue;
      }
    }
    return parsed;
  }

  private filterActive(params: {
    entries: KvVelocityEntry[];
    nowMs: number;
  }): KvVelocityEntry[] {
    const cutoff = params.nowMs - this.windowMs;
    return params.entries.filter((entry) => entry.timestamp_ms >= cutoff);
  }

  private async writeEntries(params: {
    key: string;
    entries: KvVelocityEntry[];
  }): Promise<void> {
    await kv.del(params.key);
    if (params.entries.length === 0) {
      return;
    }
    const values = params.entries.map((entry) => JSON.stringify(entry));
    await kv.rpush(params.key, ...values);
    await kv.expire(params.key, Math.ceil(this.windowMs / 1000));
  }

  async record(params: {
    key: string;
    key_type: VelocityRecord["key_type"];
    session_id: string;
  }): Promise<void> {
    const sk = this.storeKey({ key: params.key, key_type: params.key_type });
    const nowMs = this.getNowMs();
    const rawEntries = await kv.lrange(sk, 0, -1);
    const parsed = this.parseEntries(rawEntries);
    const active = this.filterActive({ entries: parsed, nowMs });

    if (!active.some((entry) => entry.session_id === params.session_id)) {
      active.push({ session_id: params.session_id, timestamp_ms: nowMs });
    }

    await this.writeEntries({ key: sk, entries: active });
  }

  async get(params: {
    key: string;
    key_type: VelocityRecord["key_type"];
  }): Promise<VelocityRecord | null> {
    const sk = this.storeKey({ key: params.key, key_type: params.key_type });
    const nowMs = this.getNowMs();
    const rawEntries = await kv.lrange(sk, 0, -1);
    const parsed = this.parseEntries(rawEntries);
    const active = this.filterActive({ entries: parsed, nowMs });

    if (active.length === 0) {
      return null;
    }

    await this.writeEntries({ key: sk, entries: active });

    const minTimestamp = Math.min(...active.map((entry) => entry.timestamp_ms));

    return {
      key: params.key,
      key_type: params.key_type,
      session_ids: active.map((entry) => entry.session_id),
      window_start: getIsoTimestampFromUnix({ seconds: Math.floor(minTimestamp / 1000) }),
      window_end: getIsoTimestamp(),
      count: active.length,
    };
  }

  async prune(): Promise<number> {
    return 0;
  }
}

/* ── Velocity Thresholds ─────────────────────────────────── */

export function getVelocityThreshold(params: { key_type: VelocityRecord["key_type"] }): number {
  switch (params.key_type) {
    case "email": return VELOCITY_MAX_SESSIONS_PER_EMAIL;
    case "ip": return VELOCITY_MAX_SESSIONS_PER_IP;
    case "device": return VELOCITY_MAX_SESSIONS_PER_DEVICE;
  }
}
