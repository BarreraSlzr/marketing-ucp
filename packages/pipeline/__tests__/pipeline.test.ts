import { beforeEach, describe, expect, test } from "bun:test";
import {
    PipelineChecksumSchema,
    computeDataChecksum,
    computePipelineChecksum,
} from "../checksum";
import {
    InMemoryPipelineStorage,
    PipelineEmitter,
} from "../emitter";
import {
    PipelineEventSchema,
    PipelineEventStatusSchema,
    PipelineStepSchema,
    createPipelineEvent,
    type PipelineEvent,
    type PipelineStep,
} from "../event";
import {
    PIPELINE_CHECKOUT_DIGITAL,
    PIPELINE_CHECKOUT_PHYSICAL,
    PIPELINE_CHECKOUT_SUBSCRIPTION,
    PIPELINE_DEFINITIONS,
    getPipelineDefinition,
} from "../registry";

/* ── Helpers ─────────────────────────────────────────────── */

function makeEvent(params: {
  pipeline_id?: string;
  step: PipelineStep;
  status?: "success" | "failure" | "pending" | "skipped";
  handler?: string;
  input_checksum?: string;
  output_checksum?: string;
}): PipelineEvent {
  return createPipelineEvent({
    pipeline_id: params.pipeline_id ?? "pipe_001",
    step: params.step,
    status: params.status ?? "success",
    handler: params.handler ?? "polar",
    input_checksum: params.input_checksum,
    output_checksum: params.output_checksum,
  });
}

/* ── PipelineEvent Schema ────────────────────────────────── */

describe("PipelineEventSchema", () => {
  test("accepts a valid event", () => {
    const event = makeEvent({ step: "buyer_validated" });
    const result = PipelineEventSchema.safeParse(event);
    expect(result.success).toBe(true);
  });

  test("rejects event with invalid step", () => {
    const result = PipelineEventSchema.safeParse({
      id: "evt_1",
      pipeline_id: "pipe_001",
      step: "invalid_step",
      status: "success",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  test("rejects event with invalid status", () => {
    const result = PipelineEventSchema.safeParse({
      id: "evt_1",
      pipeline_id: "pipe_001",
      step: "buyer_validated",
      status: "unknown",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  test("rejects event with missing required fields", () => {
    const result = PipelineEventSchema.safeParse({
      step: "buyer_validated",
    });
    expect(result.success).toBe(false);
  });

  test("accepts optional fields", () => {
    const event = makeEvent({
      step: "payment_initiated",
      handler: "shopify",
      input_checksum: "abc123",
      output_checksum: "def456",
    });
    expect(event.handler).toBe("shopify");
    expect(event.input_checksum).toBe("abc123");
    expect(event.output_checksum).toBe("def456");
  });
});

describe("PipelineStepSchema", () => {
  test("enumerates all expected steps", () => {
    const steps = PipelineStepSchema.options;
    expect(steps).toContain("buyer_validated");
    expect(steps).toContain("address_validated");
    expect(steps).toContain("payment_initiated");
    expect(steps).toContain("payment_confirmed");
    expect(steps).toContain("fulfillment_delegated");
    expect(steps).toContain("webhook_received");
    expect(steps).toContain("webhook_verified");
    expect(steps).toContain("checkout_completed");
    expect(steps).toContain("checkout_failed");
    expect(steps.length).toBe(9);
  });
});

describe("PipelineEventStatusSchema", () => {
  test("enumerates all statuses", () => {
    const statuses = PipelineEventStatusSchema.options;
    expect(statuses).toEqual(["success", "failure", "pending", "skipped"]);
  });
});

describe("createPipelineEvent", () => {
  test("generates id and timestamp automatically", () => {
    const event = createPipelineEvent({
      pipeline_id: "pipe_auto",
      step: "buyer_validated",
      status: "success",
    });
    expect(event.id).toBeTruthy();
    expect(event.timestamp).toBeTruthy();
    expect(event.pipeline_id).toBe("pipe_auto");
  });
});

/* ── PipelineChecksum ────────────────────────────────────── */

describe("computePipelineChecksum", () => {
  test("correctly validates a physical checkout pipeline", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "address_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "fulfillment_delegated" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
    });

    expect(checksum.is_valid).toBe(true);
    expect(checksum.steps_completed).toBe(6);
    expect(checksum.steps_failed).toBe(0);
    expect(checksum.chain_hash).toBeTruthy();
    expect(checksum.pipeline_id).toBe("pipe_001");
  });

  test("correctly detects a missing required step", async () => {
    // Missing fulfillment_delegated and checkout_completed
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "address_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "payment_confirmed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
    });

    expect(checksum.is_valid).toBe(false);
    expect(checksum.steps_completed).toBe(4);
  });

  test("validates a digital checkout pipeline", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
    });

    expect(checksum.is_valid).toBe(true);
  });

  test("validates a subscription checkout pipeline", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "webhook_received" }),
      makeEvent({ step: "webhook_verified" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_SUBSCRIPTION,
      events,
    });

    expect(checksum.is_valid).toBe(true);
  });

  test("marks pipeline invalid when a required step failed", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "address_validated" }),
      makeEvent({ step: "payment_initiated", status: "failure" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
    });

    expect(checksum.is_valid).toBe(false);
    expect(checksum.steps_failed).toBe(1);
  });

  test("chain_hash changes if a step's data is altered (tamper detection)", async () => {
    const events1: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", input_checksum: "aaa" }),
      makeEvent({ step: "payment_initiated", input_checksum: "bbb" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const events2: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", input_checksum: "TAMPERED" }),
      makeEvent({ step: "payment_initiated", input_checksum: "bbb" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum1 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events: events1,
    });
    const checksum2 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events: events2,
    });

    expect(checksum1.chain_hash).not.toBe(checksum2.chain_hash);
  });

  test("checksum schema validates output", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
    });

    const result = PipelineChecksumSchema.safeParse(checksum);
    expect(result.success).toBe(true);
  });
});

describe("computeDataChecksum", () => {
  test("produces consistent hash for the same input", async () => {
    const h1 = await computeDataChecksum({ data: { a: 1, b: 2 } });
    const h2 = await computeDataChecksum({ data: { a: 1, b: 2 } });
    expect(h1).toBe(h2);
  });

  test("produces different hash for different input", async () => {
    const h1 = await computeDataChecksum({ data: { a: 1 } });
    const h2 = await computeDataChecksum({ data: { a: 2 } });
    expect(h1).not.toBe(h2);
  });
});

/* ── Registry ────────────────────────────────────────────── */

describe("Pipeline Registry", () => {
  test("has 3 pipeline definitions", () => {
    expect(PIPELINE_DEFINITIONS.length).toBe(3);
  });

  test("getPipelineDefinition returns correct definition by type", () => {
    const physical = getPipelineDefinition({ type: "checkout_physical" });
    expect(physical).toBeDefined();
    expect(physical!.name).toBe("Physical Product Checkout");

    const digital = getPipelineDefinition({ type: "checkout_digital" });
    expect(digital).toBeDefined();

    const subscription = getPipelineDefinition({ type: "checkout_subscription" });
    expect(subscription).toBeDefined();
  });

  test("getPipelineDefinition returns undefined for unknown type", () => {
    const unknown = getPipelineDefinition({ type: "checkout_unknown" });
    expect(unknown).toBeUndefined();
  });

  test("physical checkout requires address_validated", () => {
    expect(PIPELINE_CHECKOUT_PHYSICAL.required_steps).toContain("address_validated");
  });

  test("digital checkout does NOT require address_validated", () => {
    expect(PIPELINE_CHECKOUT_DIGITAL.required_steps).not.toContain("address_validated");
  });

  test("subscription checkout requires webhook steps", () => {
    expect(PIPELINE_CHECKOUT_SUBSCRIPTION.required_steps).toContain("webhook_received");
    expect(PIPELINE_CHECKOUT_SUBSCRIPTION.required_steps).toContain("webhook_verified");
  });
});

/* ── Emitter ─────────────────────────────────────────────── */

describe("PipelineEmitter", () => {
  let emitter: PipelineEmitter;

  beforeEach(() => {
    emitter = new PipelineEmitter();
  });

  test("stores and retrieves events correctly", async () => {
    const event = makeEvent({ step: "buyer_validated", pipeline_id: "pipe_test" });
    await emitter.emitPipelineEvent({ event });

    const events = await emitter.getPipelineEvents({ pipeline_id: "pipe_test" });
    expect(events.length).toBe(1);
    expect(events[0].step).toBe("buyer_validated");
  });

  test("returns empty array for unknown pipeline_id", async () => {
    const events = await emitter.getPipelineEvents({ pipeline_id: "nonexistent" });
    expect(events.length).toBe(0);
  });

  test("rejects invalid events via Zod validation", async () => {
    const badEvent = { step: "invalid" } as unknown as PipelineEvent;
    expect(() => emitter.emitPipelineEvent({ event: badEvent })).toThrow();
  });

  test("computes checksum for stored events", async () => {
    const pipelineId = "pipe_checksum";
    const steps: PipelineStep[] = [
      "buyer_validated",
      "payment_initiated",
      "payment_confirmed",
      "checkout_completed",
    ];

    for (const step of steps) {
      await emitter.emitPipelineEvent({
        event: makeEvent({ step, pipeline_id: pipelineId }),
      });
    }

    const checksum = await emitter.getPipelineChecksum({
      pipeline_id: pipelineId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    expect(checksum.is_valid).toBe(true);
    expect(checksum.steps_completed).toBe(4);
  });

  test("isolates events by pipeline_id", async () => {
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", pipeline_id: "pipe_a" }),
    });
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "payment_initiated", pipeline_id: "pipe_b" }),
    });

    const eventsA = await emitter.getPipelineEvents({ pipeline_id: "pipe_a" });
    const eventsB = await emitter.getPipelineEvents({ pipeline_id: "pipe_b" });
    expect(eventsA.length).toBe(1);
    expect(eventsB.length).toBe(1);
    expect(eventsA[0].step).toBe("buyer_validated");
    expect(eventsB[0].step).toBe("payment_initiated");
  });

  test("clear removes all events", async () => {
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", pipeline_id: "pipe_clear" }),
    });
    await emitter.clear();

    const events = await emitter.getPipelineEvents({ pipeline_id: "pipe_clear" });
    expect(events.length).toBe(0);
  });

  test("accepts custom storage backend", async () => {
    const customStorage = new InMemoryPipelineStorage();
    const customEmitter = new PipelineEmitter({ storage: customStorage });

    await customEmitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", pipeline_id: "pipe_custom" }),
    });

    // Verify by accessing storage directly
    const events = customStorage.getByPipelineId({ pipeline_id: "pipe_custom" });
    expect(events.length).toBe(1);
  });
});
