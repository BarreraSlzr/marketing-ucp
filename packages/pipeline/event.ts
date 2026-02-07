// LEGEND: Pipeline event schema — structured runtime event log for UCP checkout pipelines
// Every step in a checkout pipeline emits a PipelineEvent for observability and verification
// Event IDs are composite coordinates: {session}.{pipeline}.{step}.{seq}
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";
import { getIsoTimestamp } from "../../utils/stamp";
import { ChecksumHexSchema, SessionIdSchema, type PipelineType } from "./constants";
import { EventIdSchema, createEventId } from "./event-id";

/* ── Step Enum ───────────────────────────────────────────── */

export const PipelineStepSchema = z.enum([
  "buyer_validated",
  "address_validated",
  "payment_initiated",
  "payment_confirmed",
  "fulfillment_delegated",
  "webhook_received",
  "webhook_verified",
  "checkout_completed",
  "checkout_failed",
]);

export type PipelineStep = z.infer<typeof PipelineStepSchema>;

/* ── Status Enum ─────────────────────────────────────────── */

export const PipelineEventStatusSchema = z.enum([
  "success",
  "failure",
  "pending",
  "skipped",
]);

export type PipelineEventStatus = z.infer<typeof PipelineEventStatusSchema>;

/* ── PipelineEvent ───────────────────────────────────────── */

export const PipelineEventSchema = z.object({
  /** Composite event ID: {session}.{pipeline}.{step}.{seq} */
  id: EventIdSchema,
  /** Checkout session ID — the universal traveler across systems */
  session_id: SessionIdSchema,
  /** Pipeline type from the registry (matrix column) */
  pipeline_type: z.string().min(1),
  /** Which step fired (matrix row) */
  step: PipelineStepSchema,
  /** Retry/attempt sequence number (0 = first attempt) */
  sequence: z.number().nonnegative().default(0),
  /** Outcome of the step */
  status: PipelineEventStatusSchema,
  /** Payment handler that processed this step (e.g. "polar", "shopify") */
  handler: z.string().optional(),
  /** SHA-256 hex digest of the step's input payload */
  input_checksum: ChecksumHexSchema.optional(),
  /** SHA-256 hex digest of the step's output payload */
  output_checksum: ChecksumHexSchema.optional(),
  /** Wall-clock duration of the step in milliseconds */
  duration_ms: z.number().nonnegative().optional(),
  /** Error message if status === "failure" */
  error: z.string().optional(),
  /** Arbitrary metadata for debugging / auditing */
  metadata: z.record(z.unknown()).optional(),
  /** ISO-8601 timestamp — MUST use canonical getIsoTimestamp() */
  timestamp: z.string().datetime(),
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

/* ── Helpers ─────────────────────────────────────────────── */

/** Create a new PipelineEvent with composite ID, canonical timestamp */
export function createPipelineEvent(params: {
  session_id: string;
  pipeline_type: PipelineType;
  step: PipelineStep;
  status: PipelineEventStatus;
  sequence?: number;
  handler?: string;
  input_checksum?: string;
  output_checksum?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}): PipelineEvent {
  const seq = params.sequence ?? 0;
  const id = createEventId({
    session_id: params.session_id,
    pipeline_type: params.pipeline_type,
    step: params.step,
    sequence: seq,
  });

  return PipelineEventSchema.parse({
    id,
    session_id: params.session_id,
    pipeline_type: params.pipeline_type,
    sequence: seq,
    timestamp: getIsoTimestamp(),
    step: params.step,
    status: params.status,
    handler: params.handler,
    input_checksum: params.input_checksum,
    output_checksum: params.output_checksum,
    duration_ms: params.duration_ms,
    error: params.error,
    metadata: params.metadata,
  });
}
