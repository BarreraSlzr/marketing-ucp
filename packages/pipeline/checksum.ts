// LEGEND: Pipeline checksum — tamper-proof chain hash for verifying checkout pipelines
// Chain hash: each step's checksum FEEDS into the next (mini-blockchain receipt)
//   hash_0 = SHA256("GENESIS" + ":" + step_0 + ":" + input_0 + ":" + output_0)
//   hash_n = SHA256(hash_n-1  + ":" + step_n + ":" + input_n + ":" + output_n)
//   chain_hash = SHA256(session_id + ":" + hash_n)
// Same events → same hash. ANY system can independently verify.
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";
import { getIsoTimestamp } from "../../utils/stamp";
import { ChecksumHexSchema, SessionIdSchema } from "./constants";
import { PipelineEventStatusSchema, PipelineStepSchema, type PipelineEvent } from "./event";
import type { PipelineDefinition } from "./registry";

/* ── PipelineChecksum Schema ─────────────────────────────── */

export const PipelineChecksumSchema = z.object({
  /** Checkout session ID — the universal traveler */
  session_id: SessionIdSchema,
  /** Pipeline type from the registry */
  pipeline_type: z.string().min(1),
  /** Total steps expected by the pipeline definition */
  steps_expected: z.number().nonnegative(),
  /** Steps completed with status "success" */
  steps_completed: z.number().nonnegative(),
  /** Steps completed with status "failure" */
  steps_failed: z.number().nonnegative(),
  /** True when all required steps succeeded */
  is_valid: z.boolean(),
  /** Chain hash — SHA-256, each step feeds the next, finalized with session_id */
  chain_hash: ChecksumHexSchema,
  /** ISO-8601 timestamp of computation */
  computed_at: z.string().datetime(),
});

export type PipelineChecksum = z.infer<typeof PipelineChecksumSchema>;

export const PipelineReceiptEntrySchema = z.object({
  step: PipelineStepSchema,
  status: PipelineEventStatusSchema,
  input_checksum: ChecksumHexSchema.nullable(),
  output_checksum: ChecksumHexSchema.nullable(),
  step_hash: ChecksumHexSchema,
  previous_hash: ChecksumHexSchema.nullable(),
  timestamp: z.string().datetime().nullable(),
});

export const PipelineReceiptSchema = PipelineChecksumSchema.extend({
  entries: z.array(PipelineReceiptEntrySchema),
  missing_steps: z.array(PipelineStepSchema),
});

export type PipelineReceiptEntry = z.infer<typeof PipelineReceiptEntrySchema>;
export type PipelineReceipt = z.infer<typeof PipelineReceiptSchema>;

/* ── SHA-256 helper (works in Node, Bun, and Edge) ───────── */

async function sha256(params: { data: string }): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(params.data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Step-level chain hash ───────────────────────────────── */

const GENESIS = "GENESIS" as const;

/** Compute hash for a single step, chaining from the previous hash */
export async function computeStepHash(params: {
  previous_hash: string | null;
  step: string;
  input_checksum: string;
  output_checksum: string;
}): Promise<string> {
  const seed = params.previous_hash ?? GENESIS;
  return sha256({
    data: `${seed}:${params.step}:${params.input_checksum}:${params.output_checksum}`,
  });
}

/** Compute the final chain hash over an ordered list of step checksums, scoped to session */
export async function computeChainHash(params: {
  session_id: string;
  events: Array<{ step: string; input_checksum: string; output_checksum: string }>;
}): Promise<string> {
  let hash: string | null = null;
  for (const event of params.events) {
    hash = await computeStepHash({
      previous_hash: hash,
      step: event.step,
      input_checksum: event.input_checksum,
      output_checksum: event.output_checksum,
    });
  }
  return finalizeChainHash({ session_id: params.session_id, last_hash: hash });
}

function finalizeChainHash(params: {
  session_id: string;
  last_hash: string | null;
}): Promise<string> {
  // Finalize with session_id so the hash is globally unique
  return sha256({ data: `${params.session_id}:${params.last_hash ?? "EMPTY"}` });
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
  session_id: string;
}): Promise<PipelineChecksum> {
  const { definition, events, session_id } = params;

  // Sort events by timestamp for deterministic chain
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Build chain hash — each step feeds into the next
  const chainHash = await computeChainHash({
    session_id,
    events: sorted.map((e) => ({
      step: e.step,
      input_checksum: e.input_checksum ?? "",
      output_checksum: e.output_checksum ?? "",
    })),
  });

  // Count outcomes
  const successSteps = new Set(
    sorted.filter((e) => e.status === "success").map((e) => e.step)
  );
  const failedSteps = new Set(
    sorted.filter((e) => e.status === "failure").map((e) => e.step)
  );

  // Validate: all required steps must have succeeded
  const allRequiredMet = definition.required_steps.every((step) =>
    successSteps.has(step)
  );

  return PipelineChecksumSchema.parse({
    session_id,
    pipeline_type: definition.type,
    steps_expected: definition.required_steps.length + definition.optional_steps.length,
    steps_completed: successSteps.size,
    steps_failed: failedSteps.size,
    is_valid: allRequiredMet,
    chain_hash: chainHash,
    computed_at: getIsoTimestamp(),
  });
}

export async function computePipelineReceipt(params: {
  definition: PipelineDefinition;
  events: PipelineEvent[];
  session_id: string;
}): Promise<PipelineReceipt> {
  const { definition, events, session_id } = params;

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const entries: z.infer<typeof PipelineReceiptEntrySchema>[] = [];
  let previousHash: string | null = null;

  for (const event of sorted) {
    const stepHash = await computeStepHash({
      previous_hash: previousHash,
      step: event.step,
      input_checksum: event.input_checksum ?? "",
      output_checksum: event.output_checksum ?? "",
    });

    entries.push({
      step: event.step,
      status: event.status,
      input_checksum: event.input_checksum ?? null,
      output_checksum: event.output_checksum ?? null,
      step_hash: stepHash,
      previous_hash: previousHash,
      timestamp: event.timestamp ?? null,
    });

    previousHash = stepHash;
  }

  const chainHash = await finalizeChainHash({
    session_id,
    last_hash: previousHash,
  });

  const successSteps = new Set(
    sorted.filter((e) => e.status === "success").map((e) => e.step)
  );
  const failedSteps = new Set(
    sorted.filter((e) => e.status === "failure").map((e) => e.step)
  );

  const allRequiredMet = definition.required_steps.every((step) =>
    successSteps.has(step)
  );

  const missingSteps = definition.required_steps.filter(
    (step) => !successSteps.has(step)
  );

  return PipelineReceiptSchema.parse({
    session_id,
    pipeline_type: definition.type,
    steps_expected: definition.required_steps.length + definition.optional_steps.length,
    steps_completed: successSteps.size,
    steps_failed: failedSteps.size,
    is_valid: allRequiredMet,
    chain_hash: chainHash,
    computed_at: getIsoTimestamp(),
    entries,
    missing_steps: missingSteps,
  });
}
