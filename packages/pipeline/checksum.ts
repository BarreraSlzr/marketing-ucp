// LEGEND: Pipeline checksum — tamper-proof chain hash for verifying checkout pipelines
// Each step's checksum feeds into the next, creating a mini-blockchain receipt

import { z } from "zod";
import { getIsoTimestamp } from "../../utils/stamp";
import type { PipelineEvent } from "./event";
import type { PipelineDefinition } from "./registry";

/* ── PipelineChecksum Schema ─────────────────────────────── */

export const PipelineChecksumSchema = z.object({
  /** ID of the pipeline run */
  pipeline_id: z.string().min(1),
  /** Total steps expected by the pipeline definition */
  steps_expected: z.number().nonnegative(),
  /** Steps completed with status "success" */
  steps_completed: z.number().nonnegative(),
  /** Steps completed with status "failure" */
  steps_failed: z.number().nonnegative(),
  /** True when all required steps succeeded */
  is_valid: z.boolean(),
  /** Chain hash — SHA-256 hex of the ordered step checksums */
  chain_hash: z.string().min(1),
  /** ISO-8601 timestamp of computation */
  computed_at: z.string().datetime(),
});

export type PipelineChecksum = z.infer<typeof PipelineChecksumSchema>;

/* ── SHA-256 helper (works in Node, Bun, and Edge) ───────── */

async function sha256(params: { data: string }): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(params.data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Compute checksum for a payload (input or output) ────── */

export async function computeDataChecksum(params: {
  data: unknown;
}): Promise<string> {
  const serialized = JSON.stringify(params.data, Object.keys(params.data as Record<string, unknown>).sort());
  return sha256({ data: serialized });
}

/* ── Compute pipeline checksum ───────────────────────────── */

export async function computePipelineChecksum(params: {
  definition: PipelineDefinition;
  events: PipelineEvent[];
}): Promise<PipelineChecksum> {
  const { definition, events } = params;

  if (events.length === 0 && definition.required_steps.length === 0) {
    return PipelineChecksumSchema.parse({
      pipeline_id: "",
      steps_expected: 0,
      steps_completed: 0,
      steps_failed: 0,
      is_valid: true,
      chain_hash: await sha256({ data: "empty" }),
      computed_at: getIsoTimestamp(),
    });
  }

  const pipelineId = events[0]?.pipeline_id ?? "";

  // Sort events by timestamp for deterministic chain
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Build chain hash — each step feeds into the next
  let chainInput = "";
  for (const event of sorted) {
    const eventFingerprint = [
      event.id,
      event.step,
      event.status,
      event.input_checksum ?? "",
      event.output_checksum ?? "",
      event.handler ?? "",
    ].join("|");
    chainInput += eventFingerprint;
  }
  const chainHash = await sha256({ data: chainInput });

  // Count outcomes
  const successSteps = new Set(
    sorted.filter((e) => e.status === "success").map((e) => e.step)
  );
  const failedSteps = new Set(
    sorted.filter((e) => e.status === "failure").map((e) => e.step)
  );

  const stepsCompleted = successSteps.size;
  const stepsFailed = failedSteps.size;

  // Validate: all required steps must have succeeded
  const allRequiredMet = definition.required_steps.every((step) =>
    successSteps.has(step)
  );

  return PipelineChecksumSchema.parse({
    pipeline_id: pipelineId,
    steps_expected: definition.required_steps.length + definition.optional_steps.length,
    steps_completed: stepsCompleted,
    steps_failed: stepsFailed,
    is_valid: allRequiredMet,
    chain_hash: chainHash,
    computed_at: getIsoTimestamp(),
  });
}
