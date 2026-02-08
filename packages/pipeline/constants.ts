// LEGEND: Pipeline constants — standardized constraints that lock the verification pattern
// These limits ensure all current and future integrations share a single verifiable model
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";

/* ── Session ID ──────────────────────────────────────────── */

/** Session IDs are URL-safe strings, max 128 chars. Maps to checkout.id from @repo/entities */
export const SESSION_ID_MAX_LENGTH = 128;
export const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const SessionIdSchema = z
  .string()
  .min(1)
  .max(SESSION_ID_MAX_LENGTH)
  .regex(SESSION_ID_PATTERN, "Session ID must be URL-safe (alphanumeric, _, -)")
  .describe("Checkout session ID — the universal traveler across systems");

/* ── Checksum Format ─────────────────────────────────────── */

/** All checksums are SHA-256 hex digests (64 hex chars) */
export const CHECKSUM_LENGTH = 64;
export const CHECKSUM_PATTERN = /^[a-f0-9]{64}$/;

export const ChecksumHexSchema = z
  .string()
  .length(CHECKSUM_LENGTH)
  .regex(CHECKSUM_PATTERN, "Must be a valid SHA-256 hex digest")
  .describe("SHA-256 hex digest (64 chars)");

/* ── Pipeline Type ───────────────────────────────────────── */

/** Pipeline types are a closed enum — new types require a new registry entry */
export const PipelineTypeSchema = z.enum([
  "checkout_physical",
  "checkout_digital",
  "checkout_subscription",
  "checkout_physical_antifraud",
  "checkout_digital_antifraud",
  "checkout_subscription_antifraud",
]).describe("Pipeline type — scopes the matrix column");

export type PipelineType = z.infer<typeof PipelineTypeSchema>;

/* ── Nested Pipeline Delimiter ───────────────────────────── */

/**
 * Reserved delimiter for nested/embedded pipelines.
 * Example: "chk_001.subscription>fulfillment.dispatch_initiated.0"
 * This is reserved for future use — start with flat pipelines.
 */
export const NESTED_DELIMITER = ">" as const;

/* ── Sequence ────────────────────────────────────────────── */

/** Max retry/sequence number for a single step */
export const MAX_SEQUENCE = 99;
