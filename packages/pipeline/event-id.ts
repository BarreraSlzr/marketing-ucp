// LEGEND: Hierarchical Event ID — composite coordinate system for pipeline events
// Structure: {session_id}.{pipeline_type}.{step}.{sequence}
// Every event gets a unique coordinate in the observability matrix
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";
import type { PipelineType } from "./constants";
import type { PipelineStep } from "./event";

/* ── Event ID Schema ─────────────────────────────────────── */

/**
 * Event ID structure: {session_id}.{pipeline_type}.{step}.{sequence}
 *
 * Examples:
 *   "chk_001.checkout_physical.buyer_validated.0"
 *   "chk_001.checkout_physical.payment_confirmed.1"   ← retry
 *   "chk_001.checkout_subscription.webhook_verified.0"
 *
 * Matrix coordinates:
 *   - session_id:    which checkout session (travels across systems)
 *   - pipeline_type: which pipeline definition (matrix column)
 *   - step:          which step in that pipeline (matrix row)
 *   - sequence:      retry/attempt number (0 = first attempt)
 */
export const EventIdSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]+\.[a-z_]+\.[a-z_]+\.\d+$/,
    "Event ID must match {session}.{pipeline}.{step}.{seq}"
  )
  .describe("Composite event ID: {session}.{pipeline}.{step}.{seq}");

export type EventId = z.infer<typeof EventIdSchema>;

/* ── Parsed Event ID ─────────────────────────────────────── */

export interface ParsedEventId {
  session_id: string;
  pipeline_type: string;
  step: string;
  sequence: number;
}

/* ── Create Event ID ─────────────────────────────────────── */

export function createEventId(params: {
  session_id: string;
  pipeline_type: PipelineType;
  step: PipelineStep;
  sequence?: number;
}): string {
  const seq = params.sequence ?? 0;
  const id = `${params.session_id}.${params.pipeline_type}.${params.step}.${seq}`;
  return EventIdSchema.parse(id);
}

/* ── Parse Event ID ──────────────────────────────────────── */

export function parseEventId(params: { event_id: string }): ParsedEventId {
  EventIdSchema.parse(params.event_id);
  const parts = params.event_id.split(".");
  return {
    session_id: parts[0],
    pipeline_type: parts[1],
    step: parts[2],
    sequence: parseInt(parts[3], 10),
  };
}
