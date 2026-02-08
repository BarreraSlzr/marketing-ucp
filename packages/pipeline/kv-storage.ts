// LEGEND: Vercel KV storage adapters for pipeline events and checksum registry
// Provides persistent storage across restarts using @vercel/kv
// All usage must comply with this LEGEND and the LICENSE

import { kv } from "@vercel/kv";
import type { PipelineStorage } from "./emitter";
import type { PipelineEvent } from "./event";
import type { ChecksumRegistryEntry, ChecksumRegistryStorage } from "./registry-entry";

const EVENTS_KEY_PREFIX = "ucp:pipeline:events";
const REGISTRY_KEY_PREFIX = "ucp:pipeline:registry";
const SESSION_SET_KEY = "ucp:pipeline:sessions";
const REGISTRY_SESSION_SET_KEY = "ucp:pipeline:registry:sessions";

function eventsKey(params: { session_id: string }): string {
  return `${EVENTS_KEY_PREFIX}:${params.session_id}`;
}

function registryKey(params: { session_id: string }): string {
  return `${REGISTRY_KEY_PREFIX}:${params.session_id}`;
}

function parseJson<T>(value: unknown): T | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export class VercelKvPipelineStorage implements PipelineStorage {
  async store(params: { event: PipelineEvent }): Promise<void> {
    await kv.sadd(SESSION_SET_KEY, params.event.session_id);
    await kv.rpush(eventsKey({ session_id: params.event.session_id }), JSON.stringify(params.event));
  }

  async getBySessionId(params: { session_id: string }): Promise<PipelineEvent[]> {
    const entries = await kv.lrange(eventsKey({ session_id: params.session_id }), 0, -1);
    return entries
      .map((entry) => parseJson<PipelineEvent>(entry))
      .filter((entry): entry is PipelineEvent => Boolean(entry));
  }

  async clear(): Promise<void> {
    const sessions = await kv.smembers(SESSION_SET_KEY);
    const keys = sessions.map((session_id) => eventsKey({ session_id }));
    if (keys.length > 0) {
      await kv.del(...keys);
    }
    await kv.del(SESSION_SET_KEY);
  }
}

export class VercelKvChecksumRegistryStorage implements ChecksumRegistryStorage {
  async store(params: { entry: ChecksumRegistryEntry }): Promise<void> {
    await kv.sadd(REGISTRY_SESSION_SET_KEY, params.entry.session_id);
    await kv.lpush(registryKey({ session_id: params.entry.session_id }), JSON.stringify(params.entry));
  }

  async getBySessionId(params: { session_id: string }): Promise<ChecksumRegistryEntry[]> {
    const entries = await kv.lrange(registryKey({ session_id: params.session_id }), 0, -1);
    return entries
      .map((entry) => parseJson<ChecksumRegistryEntry>(entry))
      .filter((entry): entry is ChecksumRegistryEntry => Boolean(entry));
  }

  async getLatestBySessionId(params: { session_id: string }): Promise<ChecksumRegistryEntry | null> {
    const entries = await kv.lrange(registryKey({ session_id: params.session_id }), 0, 0);
    const entry = entries[0] ? parseJson<ChecksumRegistryEntry>(entries[0]) : null;
    return entry ?? null;
  }

  async clear(): Promise<void> {
    const sessions = await kv.smembers(REGISTRY_SESSION_SET_KEY);
    const keys = sessions.map((session_id) => registryKey({ session_id }));
    if (keys.length > 0) {
      await kv.del(...keys);
    }
    await kv.del(REGISTRY_SESSION_SET_KEY);
  }
}

export async function getStoredSessionIds(): Promise<string[]> {
  return kv.smembers(SESSION_SET_KEY);
}

export async function storeSessionId(params: { session_id: string }): Promise<void> {
  await kv.sadd(SESSION_SET_KEY, params.session_id);
}
