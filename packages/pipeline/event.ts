// LEGEND: Pipeline event schema — structured runtime event log for UCP checkout pipelines
// Every step in a checkout pipeline emits a PipelineEvent for observability and verification

import { z } from "zod";
import { generateStamp, getIsoTimestamp } from "../../utils/stamp";

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
  /** Unique event ID */
  id: z.string().min(1),
  /** ID of the pipeline run this event belongs to */
  pipeline_id: z.string().min(1),
  /** Which step fired */
  step: PipelineStepSchema,
  /** Outcome of the step */
  status: PipelineEventStatusSchema,
  /** Payment handler that processed this step (e.g. "polar", "shopify") */
  handler: z.string().optional(),
  /** SHA-256 hex digest of the step's input payload */
  input_checksum: z.string().optional(),
  /** SHA-256 hex digest of the step's output payload */
  output_checksum: z.string().optional(),
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

/** Create a new PipelineEvent with canonical timestamp and generated ID */
export function createPipelineEvent(params: {
  pipeline_id: string;
  step: PipelineStep;
  status: PipelineEventStatus;
  handler?: string;
  input_checksum?: string;
  output_checksum?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}): PipelineEvent {
  return PipelineEventSchema.parse({
    id: generateStamp(),
    timestamp: getIsoTimestamp(),
    ...params,
  });
}
