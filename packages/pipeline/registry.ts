// LEGEND: Pipeline registry — canonical definitions for all UCP checkout pipeline types
// Each definition declares which steps are required vs optional for pipeline validation

import type { PipelineStep } from "./event";

/* ── PipelineDefinition ──────────────────────────────────── */

export interface PipelineDefinition {
  /** Human-readable pipeline name */
  name: string;
  /** Unique pipeline type key */
  type: string;
  /** Steps that MUST succeed for the pipeline to be valid */
  required_steps: PipelineStep[];
  /** Steps that may occur but are not mandatory */
  optional_steps: PipelineStep[];
}

/* ── Physical product checkout ───────────────────────────── */

export const PIPELINE_CHECKOUT_PHYSICAL: PipelineDefinition = {
  name: "Physical Product Checkout",
  type: "checkout_physical",
  required_steps: [
    "buyer_validated",
    "address_validated",
    "payment_initiated",
    "payment_confirmed",
    "fulfillment_delegated",
    "checkout_completed",
  ],
  optional_steps: [
    "webhook_received",
    "webhook_verified",
  ],
};

/* ── Digital product checkout ────────────────────────────── */

export const PIPELINE_CHECKOUT_DIGITAL: PipelineDefinition = {
  name: "Digital Product Checkout",
  type: "checkout_digital",
  required_steps: [
    "buyer_validated",
    "payment_initiated",
    "payment_confirmed",
    "checkout_completed",
  ],
  optional_steps: [
    "webhook_received",
    "webhook_verified",
    "fulfillment_delegated",
  ],
};

/* ── Subscription checkout ───────────────────────────────── */

export const PIPELINE_CHECKOUT_SUBSCRIPTION: PipelineDefinition = {
  name: "Subscription Checkout",
  type: "checkout_subscription",
  required_steps: [
    "buyer_validated",
    "payment_initiated",
    "payment_confirmed",
    "webhook_received",
    "webhook_verified",
    "checkout_completed",
  ],
  optional_steps: [
    "fulfillment_delegated",
  ],
};

/* ── Registry lookup ─────────────────────────────────────── */

export const PIPELINE_DEFINITIONS: PipelineDefinition[] = [
  PIPELINE_CHECKOUT_PHYSICAL,
  PIPELINE_CHECKOUT_DIGITAL,
  PIPELINE_CHECKOUT_SUBSCRIPTION,
];

export function getPipelineDefinition(params: {
  type: string;
}): PipelineDefinition | undefined {
  return PIPELINE_DEFINITIONS.find((d) => d.type === params.type);
}
