// LEGEND: Pipeline Tracker — unified service for events and checksum registry
// Manages both event emission and checksum registry snapshots
// Designed for client-side polling (useSWR) and real-time status updates
// All usage must comply with this LEGEND and the LICENSE

import { getIsoTimestamp } from "../../utils/stamp";
import { type PipelineChecksum } from "./checksum";
import { PipelineEmitter, type PipelineStorage } from "./emitter";
import type { PipelineEvent } from "./event";
import type { PipelineDefinition } from "./registry";
import {
    createChecksumRegistryEntry,
    InMemoryChecksumRegistryStorage,
    type ChecksumRegistryEntry,
    type ChecksumRegistryStorage,
} from "./registry-entry";

/* ── Tracker Configuration ───────────────────────────────── */

export interface PipelineTrackerConfig {
  /** Storage backend for pipeline events */
  eventStorage?: PipelineStorage;
  /** Storage backend for checksum registry entries */
  registryStorage?: ChecksumRegistryStorage;
  /** Whether to auto-snapshot checksums after each event */
  autoSnapshot?: boolean;
}

/* ── Pipeline Tracker ────────────────────────────────────── */

/**
 * Unified tracker for pipeline events and checksum registry.
 * 
 * Use cases:
 * 1. Emit events as they occur in the checkout flow
 * 2. Automatically or manually snapshot checksums to registry
 * 3. Query current state for useSWR/polling
 * 4. Generate issue reports with historical context
 */
export class PipelineTracker {
  private emitter: PipelineEmitter;
  private registryStorage: ChecksumRegistryStorage;
  private autoSnapshot: boolean;

  constructor(config: PipelineTrackerConfig = {}) {
    this.emitter = new PipelineEmitter({ storage: config.eventStorage });
    this.registryStorage = config.registryStorage ?? new InMemoryChecksumRegistryStorage();
    this.autoSnapshot = config.autoSnapshot ?? true;
  }

  /* ── Event Management ────────────────────────────────────── */

  /**
   * Emit a pipeline event and optionally snapshot the checksum state
   */
  async trackEvent(params: {
    event: PipelineEvent;
    definition?: PipelineDefinition;
  }): Promise<{ event: PipelineEvent; snapshot?: ChecksumRegistryEntry }> {
    const event = await this.emitter.emitPipelineEvent({ event: params.event });

    let snapshot: ChecksumRegistryEntry | undefined;
    if (this.autoSnapshot && params.definition) {
      snapshot = await this.snapshotChecksum({
        session_id: event.session_id,
        definition: params.definition,
        notes: `Auto-snapshot after event: ${event.step}`,
      });
    }

    return { event, snapshot };
  }

  /**
   * Get all events for a session
   */
  async getEvents(params: { session_id: string }): Promise<PipelineEvent[]> {
    return this.emitter.getPipelineEvents({ session_id: params.session_id });
  }

  /* ── Checksum Management ─────────────────────────────────── */

  /**
   * Compute and snapshot the current checksum state to registry
   */
  async snapshotChecksum(params: {
    session_id: string;
    definition: PipelineDefinition;
    notes?: string;
  }): Promise<ChecksumRegistryEntry> {
    const checksum = await this.emitter.getPipelineChecksum({
      session_id: params.session_id,
      definition: params.definition,
    });

    const events = await this.emitter.getPipelineEvents({
      session_id: params.session_id,
    });
    const eventIds = events
      .filter((e) => e.pipeline_type === params.definition.type)
      .map((e) => e.id);

    const entry = createChecksumRegistryEntry({
      session_id: params.session_id,
      pipeline_type: checksum.pipeline_type,
      chain_hash: checksum.chain_hash,
      steps_expected: checksum.steps_expected,
      steps_completed: checksum.steps_completed,
      steps_failed: checksum.steps_failed,
      is_valid: checksum.is_valid,
      notes: params.notes,
      event_ids: eventIds,
    });

    await this.registryStorage.store({ entry });
    return entry;
  }

  /**
   * Get the current checksum without storing to registry
   */
  async getCurrentChecksum(params: {
    session_id: string;
    definition: PipelineDefinition;
  }): Promise<PipelineChecksum> {
    return this.emitter.getPipelineChecksum({
      session_id: params.session_id,
      definition: params.definition,
    });
  }

  /* ── Registry Query ──────────────────────────────────────── */

  /**
   * Get all registry entries for a session (sorted newest first)
   */
  async getRegistryHistory(params: {
    session_id: string;
  }): Promise<ChecksumRegistryEntry[]> {
    return this.registryStorage.getBySessionId({ session_id: params.session_id });
  }

  /**
   * Get the latest registry snapshot for a session
   */
  async getLatestSnapshot(params: {
    session_id: string;
  }): Promise<ChecksumRegistryEntry | null> {
    return this.registryStorage.getLatestBySessionId({ session_id: params.session_id });
  }

  /* ── Status Summary (for useSWR) ─────────────────────────── */

  /**
   * Get a complete status summary for client-side polling
   * Includes events, current checksum, and latest snapshot
   */
  async getStatusSummary(params: {
    session_id: string;
    definition: PipelineDefinition;
  }): Promise<{
    session_id: string;
    pipeline_type: string;
    events: PipelineEvent[];
    current_checksum: PipelineChecksum;
    latest_snapshot: ChecksumRegistryEntry | null;
    registry_history: ChecksumRegistryEntry[];
  }> {
    const [events, currentChecksum, latestSnapshot, registryHistory] = await Promise.all([
      this.getEvents({ session_id: params.session_id }),
      this.getCurrentChecksum({
        session_id: params.session_id,
        definition: params.definition,
      }),
      this.getLatestSnapshot({ session_id: params.session_id }),
      this.getRegistryHistory({ session_id: params.session_id }),
    ]);

    return {
      session_id: params.session_id,
      pipeline_type: params.definition.type,
      events: events.filter((e) => e.pipeline_type === params.definition.type),
      current_checksum: currentChecksum,
      latest_snapshot: latestSnapshot,
      registry_history: registryHistory.filter(
        (e) => e.pipeline_type === params.definition.type
      ),
    };
  }

  /* ── Issue Report Generation ─────────────────────────────── */

  /**
   * Generate an issue report for debugging failed pipelines
   */
  async generateIssueReport(params: {
    session_id: string;
    definition: PipelineDefinition;
  }): Promise<{
    session_id: string;
    pipeline_type: string;
    is_valid: boolean;
    failed_steps: string[];
    missing_steps: string[];
    events: PipelineEvent[];
    checksum_history: ChecksumRegistryEntry[];
    report_generated_at: string;
  }> {
    const summary = await this.getStatusSummary({
      session_id: params.session_id,
      definition: params.definition,
    });

    const failedEvents = summary.events.filter((e) => e.status === "failure");
    const completedSteps = new Set(
      summary.events.filter((e) => e.status === "success").map((e) => e.step)
    );
    const missingSteps = params.definition.required_steps.filter(
      (step) => !completedSteps.has(step)
    );

    return {
      session_id: params.session_id,
      pipeline_type: params.definition.type,
      is_valid: summary.current_checksum.is_valid,
      failed_steps: failedEvents.map((e) => e.step),
      missing_steps: missingSteps,
      events: summary.events,
      checksum_history: summary.registry_history,
      report_generated_at: getIsoTimestamp(),
    };
  }

  /* ── Cleanup ─────────────────────────────────────────────── */

  async clear(): Promise<void> {
    await Promise.all([this.emitter.clear(), this.registryStorage.clear()]);
  }
}
