// LEGEND: Velocity store — tracks session frequency per key (email, IP, device) in time windows
// Pluggable storage: in-memory default, swap for Redis/KV in production
// All usage must comply with this LEGEND and the LICENSE

import { getIsoTimestamp } from "../../utils/stamp";
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

/* ── Velocity Thresholds ─────────────────────────────────── */

export function getVelocityThreshold(params: { key_type: VelocityRecord["key_type"] }): number {
  switch (params.key_type) {
    case "email": return VELOCITY_MAX_SESSIONS_PER_EMAIL;
    case "ip": return VELOCITY_MAX_SESSIONS_PER_IP;
    case "device": return VELOCITY_MAX_SESSIONS_PER_DEVICE;
  }
}
