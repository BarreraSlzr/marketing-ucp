// LEGEND: Pipeline event emitter — pluggable storage backend for pipeline events
// In-memory store for dev, extensible to KV/DB for production

import { computePipelineChecksum, type PipelineChecksum } from "./checksum";
import { PipelineEventSchema, type PipelineEvent } from "./event";
import type { PipelineDefinition } from "./registry";

/* ── Storage Backend Interface ───────────────────────────── */

export interface PipelineStorage {
  store(params: { event: PipelineEvent }): void | Promise<void>;
  getByPipelineId(params: { pipeline_id: string }): PipelineEvent[] | Promise<PipelineEvent[]>;
  clear(): void | Promise<void>;
}

/* ── In-Memory Storage (dev/test) ────────────────────────── */

export class InMemoryPipelineStorage implements PipelineStorage {
  private events: PipelineEvent[] = [];

  store(params: { event: PipelineEvent }): void {
    this.events.push(params.event);
  }

  getByPipelineId(params: { pipeline_id: string }): PipelineEvent[] {
    return this.events.filter((e) => e.pipeline_id === params.pipeline_id);
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
    // Validate against Zod schema
    const validated = PipelineEventSchema.parse(params.event);
    await this.storage.store({ event: validated });
    return validated;
  }

  /** Retrieve all events for a pipeline run */
  async getPipelineEvents(params: {
    pipeline_id: string;
  }): Promise<PipelineEvent[]> {
    return this.storage.getByPipelineId({ pipeline_id: params.pipeline_id });
  }

  /** Compute and return the checksum for a pipeline run */
  async getPipelineChecksum(params: {
    pipeline_id: string;
    definition: PipelineDefinition;
  }): Promise<PipelineChecksum> {
    const events = await this.storage.getByPipelineId({
      pipeline_id: params.pipeline_id,
    });
    return computePipelineChecksum({
      definition: params.definition,
      events,
    });
  }

  /** Clear all stored events (useful for testing) */
  async clear(): Promise<void> {
    await this.storage.clear();
  }
}
