// LEGEND: Checksum Registry Entry — historical snapshot of pipeline checksum state
// Stores each computed checksum pattern for audit trail and issue tracking
// Each entry represents a "moment in time" for a given session's pipeline state
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";
import { getIsoTimestamp } from "../../utils/stamp";
import { ChecksumHexSchema, PipelineTypeSchema, SessionIdSchema } from "./constants";

/* ── Registry Entry Schema ───────────────────────────────── */

/**
 * A registry entry captures the checksum state at a specific moment.
 * Used for:
 * - Historical audit trail of pipeline states
 * - Issue tracking and debugging
 * - Client-side polling and real-time updates
 * - Compliance and verification records
 */
export const ChecksumRegistryEntrySchema = z.object({
  /** Unique ID for this registry entry */
  id: z.string().min(1).describe("Registry entry ID (e.g., UUID or timestamp-based)"),
  /** Checkout session ID — the universal traveler */
  session_id: SessionIdSchema,
  /** Pipeline type from the registry */
  pipeline_type: PipelineTypeSchema,
  /** Chain hash snapshot at this moment */
  chain_hash: ChecksumHexSchema,
  /** Total steps expected by the pipeline definition */
  steps_expected: z.number().nonnegative(),
  /** Steps completed with status "success" at this moment */
  steps_completed: z.number().nonnegative(),
  /** Steps completed with status "failure" at this moment */
  steps_failed: z.number().nonnegative(),
  /** True when all required steps succeeded at this moment */
  is_valid: z.boolean(),
  /** ISO-8601 timestamp when this entry was created */
  created_at: z.string().datetime(),
  /** Optional notes or metadata for debugging */
  notes: z.string().optional(),
  /** Reference to specific event IDs that contributed to this checksum */
  event_ids: z.array(z.string()).optional(),
});

export type ChecksumRegistryEntry = z.infer<typeof ChecksumRegistryEntrySchema>;

/* ── Create Registry Entry ───────────────────────────────── */

/**
 * Create a new checksum registry entry from a pipeline checksum
 */
export function createChecksumRegistryEntry(params: {
  session_id: string;
  pipeline_type: string;
  chain_hash: string;
  steps_expected: number;
  steps_completed: number;
  steps_failed: number;
  is_valid: boolean;
  notes?: string;
  event_ids?: string[];
}): ChecksumRegistryEntry {
  const id = `reg_${params.session_id}_${Date.now()}`;
  
  return ChecksumRegistryEntrySchema.parse({
    id,
    session_id: params.session_id,
    pipeline_type: params.pipeline_type,
    chain_hash: params.chain_hash,
    steps_expected: params.steps_expected,
    steps_completed: params.steps_completed,
    steps_failed: params.steps_failed,
    is_valid: params.is_valid,
    created_at: getIsoTimestamp(),
    notes: params.notes,
    event_ids: params.event_ids,
  });
}

/* ── Registry Storage Interface ──────────────────────────── */

export interface ChecksumRegistryStorage {
  store(params: { entry: ChecksumRegistryEntry }): void | Promise<void>;
  getBySessionId(params: { session_id: string }): ChecksumRegistryEntry[] | Promise<ChecksumRegistryEntry[]>;
  getLatestBySessionId(params: { session_id: string }): ChecksumRegistryEntry | null | Promise<ChecksumRegistryEntry | null>;
  clear(): void | Promise<void>;
}

/* ── In-Memory Registry Storage ──────────────────────────── */

export class InMemoryChecksumRegistryStorage implements ChecksumRegistryStorage {
  private entries: ChecksumRegistryEntry[] = [];

  store(params: { entry: ChecksumRegistryEntry }): void {
    this.entries.push(params.entry);
  }

  getBySessionId(params: { session_id: string }): ChecksumRegistryEntry[] {
    return this.entries
      .filter((e) => e.session_id === params.session_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getLatestBySessionId(params: { session_id: string }): ChecksumRegistryEntry | null {
    const entries = this.getBySessionId(params);
    return entries.length > 0 ? entries[0] : null;
  }

  clear(): void {
    this.entries = [];
  }
}
