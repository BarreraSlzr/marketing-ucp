// LEGEND: Antifraud velocity store singleton for shared risk assessment state
// Uses persistent KV storage when available, falls back to in-memory storage
// All usage must comply with this LEGEND and the LICENSE

import {
    InMemoryVelocityStorage,
    VercelKvVelocityStorage,
    type VelocityStorage,
} from "@repo/antifraud";

const usePersistentStorage = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

let sharedVelocityStore: VelocityStorage | null = null;

export function getSharedVelocityStore(): VelocityStorage {
  if (!sharedVelocityStore) {
    sharedVelocityStore = usePersistentStorage
      ? new VercelKvVelocityStorage()
      : new InMemoryVelocityStorage();
  }
  return sharedVelocityStore;
}

export function resetSharedVelocityStore(): void {
  sharedVelocityStore = null;
}
