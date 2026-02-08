// LEGEND: Global pipeline tracker singleton for in-memory demo
// In production, this would be replaced with persistent storage
// All usage must comply with this LEGEND and the LICENSE

import {
    InMemoryPipelineStorage,
    PipelineTracker
} from "@repo/pipeline";

// Shared in-memory storage so events are visible across all emitters
const sharedStorage = new InMemoryPipelineStorage();

// Global singleton tracker for demo purposes
// In production, inject persistent storage (KV, DB, etc.)
let globalTracker: PipelineTracker | null = null;

// Cache of all session IDs we've seen
const sessionIds = new Set<string>();

export function getGlobalTracker(): PipelineTracker {
  if (!globalTracker) {
    globalTracker = new PipelineTracker({
      eventStorage: sharedStorage,
      autoSnapshot: true,
    });
  }
  return globalTracker;
}

export function resetGlobalTracker(): void {
  globalTracker = null;
  sharedStorage.clear();
  sessionIds.clear();
}

export function getSharedPipelineStorage(): InMemoryPipelineStorage {
  return sharedStorage;
}

export function registerSessionId(sessionId: string): void {
  sessionIds.add(sessionId);
}

export function getAllSessionIds(): string[] {
  return Array.from(sessionIds);
}
