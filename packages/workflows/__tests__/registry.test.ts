import { describe, expect, test } from "bun:test";
import {
  WORKFLOW_CHECKOUT_BASELINE,
  WORKFLOW_CHECKOUT_DIGITAL,
  WORKFLOW_CHECKOUT_SUBSCRIPTION,
  WORKFLOW_DEFINITIONS,
  getWorkflowDefinition,
  getWorkflowsByActionId,
  getWorkflowsByFormId,
} from "../registry";

/* ── Registry Basics ─────────────────────────────────────── */

describe("WORKFLOW_DEFINITIONS", () => {
  test("contains unique workflow IDs", () => {
    const ids = WORKFLOW_DEFINITIONS.map((workflow) => workflow.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ── Checkout Baseline ───────────────────────────────────── */

describe("WORKFLOW_CHECKOUT_BASELINE", () => {
  test("is retrievable by ID", () => {
    expect(getWorkflowDefinition({ id: "checkout_baseline" })).toBe(
      WORKFLOW_CHECKOUT_BASELINE
    );
  });

  test("maps buyer and payment forms", () => {
    const buyer = getWorkflowsByFormId({ form_id: "buyer-form" });
    const payment = getWorkflowsByFormId({ form_id: "payment-form" });
    expect(buyer).toContain(WORKFLOW_CHECKOUT_BASELINE);
    expect(payment).toContain(WORKFLOW_CHECKOUT_BASELINE);
  });

  test("maps submit checkout action", () => {
    const result = getWorkflowsByActionId({ action_id: "submitCheckoutAction" });
    expect(result).toContain(WORKFLOW_CHECKOUT_BASELINE);
  });
});

describe("Workflow variants", () => {
  test("retrieves digital + subscription definitions", () => {
    expect(getWorkflowDefinition({ id: "checkout_digital" })).toBe(
      WORKFLOW_CHECKOUT_DIGITAL
    );
    expect(getWorkflowDefinition({ id: "checkout_subscription" })).toBe(
      WORKFLOW_CHECKOUT_SUBSCRIPTION
    );
  });
});
