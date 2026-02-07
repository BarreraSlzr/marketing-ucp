// LEGEND: Pipeline event emitter — pluggable storage backend for pipeline events
// In-memory store for dev, extensible to KV/DB for production
// Events are keyed by session_id (the universal traveler across systems)
// All usage must comply with this LEGEND and the LICENSE

import { computePipelineChecksum, type PipelineChecksum } from "./checksum";
import { PipelineEventSchema, type PipelineEvent } from "./event";
import type { PipelineDefinition } from "./registry";

/* ── Storage Backend Interface ───────────────────────────── */

export interface PipelineStorage {
  store(params: { event: PipelineEvent }): void | Promise<void>;
  getBySessionId(params: { session_id: string }): PipelineEvent[] | Promise<PipelineEvent[]>;
  clear(): void | Promise<void>;
}

/* ── In-Memory Storage (dev/test) ────────────────────────── */

export class InMemoryPipelineStorage implements PipelineStorage {
  private events: PipelineEvent[] = [];

  store(params: { event: PipelineEvent }): void {
    this.events.push(params.event);
  }

  getBySessionId(params: { session_id: string }): PipelineEvent[] {
    return this.events.filter((e) => e.session_id === params.session_id);
  }

  clear(): void {
    this.events = [];
  }
}

/* ── Pipeline Emitter ────────────────────────────────────── */

export class PipelineEmitter {
  private storage: PipelineStorage;

  constructor(params: { storage?: PipelineStorage } = {}) {
    this.storage = params.storage ?? new InMemoryPipelineStorage();
  }

  /** Validate and store a pipeline event */
  async emitPipelineEvent(params: {
    event: PipelineEvent;
  }): Promise<PipelineEvent> {
    // Validate against Zod schema (composite ID, checksums, etc.)
    const validated = PipelineEventSchema.parse(params.event);
    await this.storage.store({ event: validated });
    return validated;
  }

  /** Retrieve all events for a checkout session */
  async getPipelineEvents(params: {
    session_id: string;
  }): Promise<PipelineEvent[]> {
    return this.storage.getBySessionId({ session_id: params.session_id });
  }

  /** Compute and return the checksum for a pipeline run within a session */
  async getPipelineChecksum(params: {
    session_id: string;
    definition: PipelineDefinition;
  }): Promise<PipelineChecksum> {
    const allEvents = await this.storage.getBySessionId({
      session_id: params.session_id,
    });
    // Filter to events matching the pipeline type
    const pipelineEvents = allEvents.filter(
      (e) => e.pipeline_type === params.definition.type
    );
    return computePipelineChecksum({
      definition: params.definition,
      events: pipelineEvents,
      session_id: params.session_id,
    });
  }

  /** Clear all stored events (useful for testing) */
  async clear(): Promise<void> {
    await this.storage.clear();
  }
}
