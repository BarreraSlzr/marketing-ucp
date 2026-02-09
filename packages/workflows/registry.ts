// LEGEND: Workflow registry — canonical definitions for user-facing flows
// Each workflow maps UI/API steps to pipeline observability steps when available
// All usage must comply with this LEGEND and the LICENSE

import type { PipelineStep, PipelineType } from "@repo/pipeline";

export type WorkflowStepKind = "page" | "form" | "action" | "api";

/** Who resolves this step: customer (interactive form) or internal (backend pipeline) */
export type WorkflowStepAudience = "customer" | "internal";

export interface WorkflowStepEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
}

export interface WorkflowStep {
  id: string;
  label: string;
  kind: WorkflowStepKind;
  /** Who resolves this step: customer-facing form or internal backend process */
  audience: WorkflowStepAudience;
  required: boolean;
  description?: string;
  form_ids?: string[];
  action_ids?: string[];
  endpoint?: WorkflowStepEndpoint;
  pipeline_steps?: PipelineStep[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: "checkout" | "payment" | "onboarding";
  version: string;
  pipeline_type?: PipelineType;
  steps: WorkflowStep[];
}

/* ── Checkout Baseline ───────────────────────────────────── */

export const WORKFLOW_CHECKOUT_BASELINE: WorkflowDefinition = {
  id: "checkout_baseline",
  name: "Checkout Baseline Workflow",
  description:
    "Select a product, capture buyer + address details, collect payment, and confirm the order.",
  category: "checkout",
  version: "2025-02-01",
  pipeline_type: "checkout_physical",
  steps: [
    {
      id: "select_product",
      label: "Select product",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Choose a demo template or product before checkout.",
      endpoint: { method: "GET", path: "/checkout" },
    },
    {
      id: "buyer_details",
      label: "Buyer details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Capture buyer identity and contact details.",
      form_ids: ["buyer-form"],
      action_ids: ["submitBuyerAction"],
      pipeline_steps: ["buyer_validated"],
    },
    {
      id: "address_details",
      label: "Billing + shipping address",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Collect billing and shipping address data.",
      form_ids: ["billing-form", "shipping-form"],
      action_ids: ["submitAddressAction"],
      pipeline_steps: ["address_validated"],
    },
    {
      id: "payment_details",
      label: "Payment details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Collect payment details for authorization.",
      form_ids: ["payment-form"],
      action_ids: ["submitPaymentAction"],
      pipeline_steps: ["payment_initiated"],
    },
    {
      id: "submit_checkout",
      label: "Submit checkout",
      kind: "action",
      audience: "internal",
      required: true,
      description: "Finalize checkout and redirect to confirmation.",
      action_ids: ["submitCheckoutAction"],
      pipeline_steps: ["payment_confirmed", "checkout_completed"],
    },
    {
      id: "confirmation",
      label: "Confirmation",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Show the confirmation state returned by the checkout flow.",
      endpoint: { method: "GET", path: "/checkout/confirm" },
    },
  ],
};

/* ── Digital checkout ────────────────────────────────────── */

export const WORKFLOW_CHECKOUT_DIGITAL: WorkflowDefinition = {
  id: "checkout_digital",
  name: "Digital Checkout Workflow",
  description:
    "Capture buyer details, collect payment, and confirm a digital purchase.",
  category: "checkout",
  version: "2025-02-01",
  pipeline_type: "checkout_digital",
  steps: [
    {
      id: "select_product",
      label: "Select product",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Choose a digital product or demo template before checkout.",
      endpoint: { method: "GET", path: "/checkout" },
    },
    {
      id: "buyer_details",
      label: "Buyer details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Capture buyer identity and contact details.",
      form_ids: ["buyer-form"],
      action_ids: ["submitBuyerAction"],
      pipeline_steps: ["buyer_validated"],
    },
    {
      id: "payment_details",
      label: "Payment details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Collect payment details for authorization.",
      form_ids: ["payment-form"],
      action_ids: ["submitPaymentAction"],
      pipeline_steps: ["payment_initiated"],
    },
    {
      id: "submit_checkout",
      label: "Submit checkout",
      kind: "action",
      audience: "internal",
      required: true,
      description: "Finalize checkout and redirect to confirmation.",
      action_ids: ["submitCheckoutAction"],
      pipeline_steps: ["payment_confirmed", "checkout_completed"],
    },
    {
      id: "confirmation",
      label: "Confirmation",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Show the confirmation state returned by the checkout flow.",
      endpoint: { method: "GET", path: "/checkout/confirm" },
    },
  ],
};

/* ── Subscription checkout ───────────────────────────────── */

export const WORKFLOW_CHECKOUT_SUBSCRIPTION: WorkflowDefinition = {
  id: "checkout_subscription",
  name: "Subscription Checkout Workflow",
  description:
    "Capture buyer details, collect payment, and confirm an ongoing subscription.",
  category: "checkout",
  version: "2025-02-01",
  pipeline_type: "checkout_subscription",
  steps: [
    {
      id: "select_plan",
      label: "Select plan",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Choose a subscription plan before checkout.",
      endpoint: { method: "GET", path: "/checkout" },
    },
    {
      id: "buyer_details",
      label: "Buyer details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Capture buyer identity and contact details.",
      form_ids: ["buyer-form"],
      action_ids: ["submitBuyerAction"],
      pipeline_steps: ["buyer_validated"],
    },
    {
      id: "payment_details",
      label: "Payment details",
      kind: "form",
      audience: "customer",
      required: true,
      description: "Collect payment details for subscription authorization.",
      form_ids: ["payment-form"],
      action_ids: ["submitPaymentAction"],
      pipeline_steps: ["payment_initiated"],
    },
    {
      id: "submit_checkout",
      label: "Submit checkout",
      kind: "action",
      audience: "internal",
      required: true,
      description: "Submit the subscription checkout and await confirmation.",
      action_ids: ["submitCheckoutAction"],
      pipeline_steps: ["payment_confirmed", "checkout_completed"],
    },
    {
      id: "payment_webhook",
      label: "Payment webhook confirmation",
      kind: "api",
      audience: "internal",
      required: true,
      description: "Process webhook confirmation for subscription payments.",
      endpoint: { method: "POST", path: "/api/webhooks/payment" },
      pipeline_steps: ["webhook_received", "webhook_verified"],
    },
    {
      id: "confirmation",
      label: "Confirmation",
      kind: "page",
      audience: "customer",
      required: true,
      description: "Show the confirmation state returned by the checkout flow.",
      endpoint: { method: "GET", path: "/checkout/confirm" },
    },
  ],
};

/* ── Registry ────────────────────────────────────────────── */

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  WORKFLOW_CHECKOUT_BASELINE,
  WORKFLOW_CHECKOUT_DIGITAL,
  WORKFLOW_CHECKOUT_SUBSCRIPTION,
];

export function listWorkflowDefinitions(): WorkflowDefinition[] {
  return WORKFLOW_DEFINITIONS;
}

export function getWorkflowDefinition(params: {
  id: string;
}): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((workflow) => workflow.id === params.id);
}

export function getWorkflowsByFormId(params: {
  form_id: string;
}): WorkflowDefinition[] {
  return WORKFLOW_DEFINITIONS.filter((workflow) =>
    workflow.steps.some((step) => step.form_ids?.includes(params.form_id))
  );
}

export function getWorkflowsByActionId(params: {
  action_id: string;
}): WorkflowDefinition[] {
  return WORKFLOW_DEFINITIONS.filter((workflow) =>
    workflow.steps.some((step) => step.action_ids?.includes(params.action_id))
  );
}
