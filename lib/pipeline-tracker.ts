// LEGEND: Global pipeline tracker singleton for in-memory demo
// In production, this would be replaced with persistent storage
// All usage must comply with this LEGEND and the LICENSE

import {
    InMemoryChecksumRegistryStorage,
    InMemoryPipelineStorage,
    PipelineTracker,
    VercelKvChecksumRegistryStorage,
    VercelKvPipelineStorage,
    getStoredSessionIds,
    storeSessionId,
    type ChecksumRegistryStorage,
    type PipelineStorage
} from "@repo/pipeline";

const usePersistentStorage = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

const sharedEventStorage: PipelineStorage = usePersistentStorage
  ? new VercelKvPipelineStorage()
  : new InMemoryPipelineStorage();

const sharedRegistryStorage: ChecksumRegistryStorage = usePersistentStorage
  ? new VercelKvChecksumRegistryStorage()
  : new InMemoryChecksumRegistryStorage();

// Global singleton tracker for demo purposes
// In production, inject persistent storage (KV, DB, etc.)
let globalTracker: PipelineTracker | null = null;

// Cache of all session IDs we've seen
const sessionIds = new Set<string>();

export function getGlobalTracker(): PipelineTracker {
  if (!globalTracker) {
    globalTracker = new PipelineTracker({
      eventStorage: sharedEventStorage,
      registryStorage: sharedRegistryStorage,
      autoSnapshot: true,
    });
  }
  return globalTracker;
}

export function resetGlobalTracker(): void {
  globalTracker = null;
  void sharedEventStorage.clear();
  void sharedRegistryStorage.clear();
  sessionIds.clear();
}

export function getSharedPipelineStorage(): PipelineStorage {
  return sharedEventStorage;
}

export function registerSessionId(sessionId: string): void {
  if (usePersistentStorage) {
    void storeSessionId({ session_id: sessionId });
    return;
  }
  sessionIds.add(sessionId);
}

export async function getAllSessionIds(): Promise<string[]> {
  if (usePersistentStorage) {
    return getStoredSessionIds();
  }
  return Array.from(sessionIds);
}
