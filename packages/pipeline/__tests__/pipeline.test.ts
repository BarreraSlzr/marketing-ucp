import { beforeEach, describe, expect, test } from "bun:test";
import {
    PipelineChecksumSchema,
    computeChainHash,
    computeDataChecksum,
    computePipelineChecksum,
    computePipelineReceipt,
    computeStepHash,
} from "../checksum";
import {
    CHECKSUM_LENGTH,
    CHECKSUM_PATTERN,
    ChecksumHexSchema,
    MAX_SEQUENCE,
    NESTED_DELIMITER,
    PipelineTypeSchema,
    SESSION_ID_MAX_LENGTH,
    SessionIdSchema
} from "../constants";
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
    EventIdSchema,
    createEventId,
    parseEventId,
} from "../event-id";
import {
    PIPELINE_CHECKOUT_DIGITAL,
    PIPELINE_CHECKOUT_PHYSICAL,
    PIPELINE_CHECKOUT_SUBSCRIPTION,
    PIPELINE_DEFINITIONS,
    getPipelineDefinition,
} from "../registry";

/* ── Helpers ─────────────────────────────────────────────── */

const SESSION = "chk_001";
const PIPELINE_TYPE = "checkout_digital" as const;

function makeEvent(params: {
  session_id?: string;
  pipeline_type?: "checkout_physical" | "checkout_digital" | "checkout_subscription";
  step: PipelineStep;
  status?: "success" | "failure" | "pending" | "skipped";
  sequence?: number;
  handler?: string;
  input_checksum?: string;
  output_checksum?: string;
}): PipelineEvent {
  return createPipelineEvent({
    session_id: params.session_id ?? SESSION,
    pipeline_type: params.pipeline_type ?? PIPELINE_TYPE,
    step: params.step,
    status: params.status ?? "success",
    sequence: params.sequence ?? 0,
    handler: params.handler ?? "polar",
    input_checksum: params.input_checksum,
    output_checksum: params.output_checksum,
  });
}

/* ══════════════════════════════════════════════════════════ *
 *  Constants & Constraints                                  *
 * ══════════════════════════════════════════════════════════ */

describe("Constants", () => {
  test("SESSION_ID_MAX_LENGTH is 128", () => {
    expect(SESSION_ID_MAX_LENGTH).toBe(128);
  });

  test("CHECKSUM_LENGTH is 64", () => {
    expect(CHECKSUM_LENGTH).toBe(64);
  });

  test("MAX_SEQUENCE is 99", () => {
    expect(MAX_SEQUENCE).toBe(99);
  });

  test("NESTED_DELIMITER is >", () => {
    expect(NESTED_DELIMITER).toBe(">");
  });

  test("SessionIdSchema accepts valid IDs", () => {
    expect(SessionIdSchema.safeParse("chk_001").success).toBe(true);
    expect(SessionIdSchema.safeParse("session-abc-123").success).toBe(true);
  });

  test("SessionIdSchema rejects invalid IDs", () => {
    expect(SessionIdSchema.safeParse("").success).toBe(false);
    expect(SessionIdSchema.safeParse("has spaces").success).toBe(false);
    expect(SessionIdSchema.safeParse("has.dots").success).toBe(false);
    expect(SessionIdSchema.safeParse("a".repeat(129)).success).toBe(false);
  });

  test("PipelineTypeSchema enumerates all types", () => {
    expect(PipelineTypeSchema.options).toEqual([
      "checkout_physical",
      "checkout_digital",
      "checkout_subscription",
      "checkout_physical_antifraud",
      "checkout_digital_antifraud",
      "checkout_subscription_antifraud",
    ]);
  });

  test("ChecksumHexSchema validates SHA-256 hex", () => {
    const valid = "a".repeat(64);
    const invalid = "z".repeat(64);
    expect(ChecksumHexSchema.safeParse(valid).success).toBe(true);
    expect(ChecksumHexSchema.safeParse(invalid).success).toBe(false);
    expect(ChecksumHexSchema.safeParse("short").success).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Event ID — Coordinate System                             *
 * ══════════════════════════════════════════════════════════ */

describe("EventIdSchema", () => {
  test("accepts valid composite IDs", () => {
    expect(EventIdSchema.safeParse("chk_001.checkout_digital.buyer_validated.0").success).toBe(true);
    expect(EventIdSchema.safeParse("session-1.checkout_physical.payment_confirmed.3").success).toBe(true);
  });

  test("rejects malformed IDs", () => {
    expect(EventIdSchema.safeParse("plain_string").success).toBe(false);
    expect(EventIdSchema.safeParse("a.b.c").success).toBe(false);      // missing seq
    expect(EventIdSchema.safeParse("a.b.c.d.e").success).toBe(false);  // too many parts
    expect(EventIdSchema.safeParse("a.b.c.notnum").success).toBe(false);
  });
});

describe("createEventId", () => {
  test("generates correct composite ID", () => {
    const id = createEventId({
      session_id: "chk_001",
      pipeline_type: "checkout_physical",
      step: "buyer_validated",
      sequence: 0,
    });
    expect(id).toBe("chk_001.checkout_physical.buyer_validated.0");
  });

  test("defaults sequence to 0", () => {
    const id = createEventId({
      session_id: "s1",
      pipeline_type: "checkout_digital",
      step: "payment_initiated",
    });
    expect(id).toBe("s1.checkout_digital.payment_initiated.0");
  });

  test("encodes retry via sequence number", () => {
    const id = createEventId({
      session_id: "chk_001",
      pipeline_type: "checkout_subscription",
      step: "payment_confirmed",
      sequence: 2,
    });
    expect(id).toBe("chk_001.checkout_subscription.payment_confirmed.2");
  });
});

describe("parseEventId", () => {
  test("round-trips correctly", () => {
    const id = "chk_001.checkout_physical.fulfillment_delegated.1";
    const parsed = parseEventId({ event_id: id });
    expect(parsed.session_id).toBe("chk_001");
    expect(parsed.pipeline_type).toBe("checkout_physical");
    expect(parsed.step).toBe("fulfillment_delegated");
    expect(parsed.sequence).toBe(1);
  });

  test("rejects invalid IDs", () => {
    expect(() => parseEventId({ event_id: "bad" })).toThrow();
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  PipelineEvent Schema                                     *
 * ══════════════════════════════════════════════════════════ */

describe("PipelineEventSchema", () => {
  test("accepts a valid event with composite ID", () => {
    const event = makeEvent({ step: "buyer_validated" });
    const result = PipelineEventSchema.safeParse(event);
    expect(result.success).toBe(true);
    expect(event.id).toContain("buyer_validated");
    expect(event.session_id).toBe(SESSION);
    expect(event.pipeline_type).toBe(PIPELINE_TYPE);
    expect(event.sequence).toBe(0);
  });

  test("rejects event with invalid step", () => {
    const result = PipelineEventSchema.safeParse({
      id: "s.t.invalid_step.0",
      session_id: "s",
      pipeline_type: "t",
      step: "invalid_step",
      status: "success",
      sequence: 0,
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  test("rejects event with invalid status", () => {
    const result = PipelineEventSchema.safeParse({
      id: "s.t.buyer_validated.0",
      session_id: "s",
      pipeline_type: "t",
      step: "buyer_validated",
      status: "unknown",
      sequence: 0,
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

  test("accepts optional checksum fields (must be valid SHA-256 if present)", () => {
    const validHash = "a".repeat(64);
    const event = makeEvent({
      step: "payment_initiated",
      handler: "shopify",
      input_checksum: validHash,
      output_checksum: validHash,
    });
    expect(event.handler).toBe("shopify");
    expect(event.input_checksum).toBe(validHash);
    expect(event.output_checksum).toBe(validHash);
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
    expect(steps).toContain("fraud_check");
    expect(steps).toContain("fraud_review_escalated");
    expect(steps.length).toBe(11);
  });
});

describe("PipelineEventStatusSchema", () => {
  test("enumerates all statuses", () => {
    const statuses = PipelineEventStatusSchema.options;
    expect(statuses).toEqual(["success", "failure", "pending", "skipped"]);
  });
});

describe("createPipelineEvent", () => {
  test("generates composite ID and timestamp automatically", () => {
    const event = createPipelineEvent({
      session_id: "chk_auto",
      pipeline_type: "checkout_digital",
      step: "buyer_validated",
      status: "success",
    });
    expect(event.id).toBe("chk_auto.checkout_digital.buyer_validated.0");
    expect(event.session_id).toBe("chk_auto");
    expect(event.pipeline_type).toBe("checkout_digital");
    expect(event.sequence).toBe(0);
    expect(event.timestamp).toBeTruthy();
  });

  test("supports retry via sequence", () => {
    const event = createPipelineEvent({
      session_id: "chk_retry",
      pipeline_type: "checkout_subscription",
      step: "payment_confirmed",
      status: "failure",
      sequence: 1,
    });
    expect(event.id).toBe("chk_retry.checkout_subscription.payment_confirmed.1");
    expect(event.sequence).toBe(1);
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Chain Hashing                                            *
 * ══════════════════════════════════════════════════════════ */

describe("computeStepHash", () => {
  test("uses GENESIS seed for first step", async () => {
    const hash = await computeStepHash({
      previous_hash: null,
      step: "buyer_validated",
      input_checksum: "aaa",
      output_checksum: "bbb",
    });
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(64);
    expect(CHECKSUM_PATTERN.test(hash)).toBe(true);
  });

  test("chains from previous hash", async () => {
    const h1 = await computeStepHash({ previous_hash: null, step: "buyer_validated", input_checksum: "a", output_checksum: "b" });
    const h2 = await computeStepHash({ previous_hash: h1, step: "payment_initiated", input_checksum: "c", output_checksum: "d" });
    expect(h2).not.toBe(h1);
    expect(h2.length).toBe(64);
  });

  test("different inputs produce different hashes", async () => {
    const h1 = await computeStepHash({ previous_hash: null, step: "buyer_validated", input_checksum: "x", output_checksum: "y" });
    const h2 = await computeStepHash({ previous_hash: null, step: "buyer_validated", input_checksum: "x", output_checksum: "z" });
    expect(h1).not.toBe(h2);
  });

  test("different steps produce different hashes", async () => {
    const h1 = await computeStepHash({ previous_hash: null, step: "buyer_validated", input_checksum: "x", output_checksum: "y" });
    const h2 = await computeStepHash({ previous_hash: null, step: "payment_initiated", input_checksum: "x", output_checksum: "y" });
    expect(h1).not.toBe(h2);
  });
});

describe("computeChainHash", () => {
  test("produces consistent hash for same events", async () => {
    const events = [
      { step: "buyer_validated", input_checksum: "a", output_checksum: "b" },
      { step: "payment_initiated", input_checksum: "c", output_checksum: "d" },
    ];
    const h1 = await computeChainHash({ session_id: "s1", events });
    const h2 = await computeChainHash({ session_id: "s1", events });
    expect(h1).toBe(h2);
  });

  test("different session_id produces different hash", async () => {
    const events = [{ step: "buyer_validated", input_checksum: "a", output_checksum: "b" }];
    const h1 = await computeChainHash({ session_id: "s1", events });
    const h2 = await computeChainHash({ session_id: "s2", events });
    expect(h1).not.toBe(h2);
  });

  test("handles empty events", async () => {
    const hash = await computeChainHash({ session_id: "s1", events: [] });
    expect(hash.length).toBe(64);
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Pipeline Checksum                                        *
 * ══════════════════════════════════════════════════════════ */

describe("computePipelineChecksum", () => {
  test("correctly validates a physical checkout pipeline", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "address_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "payment_initiated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "payment_confirmed", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "fulfillment_delegated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "checkout_completed", pipeline_type: "checkout_physical" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
      session_id: SESSION,
    });

    expect(checksum.is_valid).toBe(true);
    expect(checksum.steps_completed).toBe(6);
    expect(checksum.steps_failed).toBe(0);
    expect(checksum.chain_hash.length).toBe(64);
    expect(checksum.session_id).toBe(SESSION);
    expect(checksum.pipeline_type).toBe("checkout_physical");
  });

  test("correctly detects a missing required step", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "address_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "payment_initiated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "payment_confirmed", pipeline_type: "checkout_physical" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
      session_id: SESSION,
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
      session_id: SESSION,
    });

    expect(checksum.is_valid).toBe(true);
  });

  test("validates a subscription checkout pipeline", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", pipeline_type: "checkout_subscription" }),
      makeEvent({ step: "payment_initiated", pipeline_type: "checkout_subscription" }),
      makeEvent({ step: "payment_confirmed", pipeline_type: "checkout_subscription" }),
      makeEvent({ step: "webhook_received", pipeline_type: "checkout_subscription" }),
      makeEvent({ step: "webhook_verified", pipeline_type: "checkout_subscription" }),
      makeEvent({ step: "checkout_completed", pipeline_type: "checkout_subscription" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_SUBSCRIPTION,
      events,
      session_id: SESSION,
    });

    expect(checksum.is_valid).toBe(true);
  });

  test("marks pipeline invalid when a required step failed", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "address_validated", pipeline_type: "checkout_physical" }),
      makeEvent({ step: "payment_initiated", pipeline_type: "checkout_physical", status: "failure" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
      session_id: SESSION,
    });

    expect(checksum.is_valid).toBe(false);
    expect(checksum.steps_failed).toBe(1);
  });

  test("chain_hash changes if a step's data is altered (tamper detection)", async () => {
    const validHash1 = "a".repeat(64);
    const validHash2 = "b".repeat(64);
    const tamperedHash = "c".repeat(64);

    const events1: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", input_checksum: validHash1 }),
      makeEvent({ step: "payment_initiated", input_checksum: validHash2 }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const events2: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", input_checksum: tamperedHash }),
      makeEvent({ step: "payment_initiated", input_checksum: validHash2 }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum1 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events: events1,
      session_id: SESSION,
    });
    const checksum2 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events: events2,
      session_id: SESSION,
    });

    expect(checksum1.chain_hash).not.toBe(checksum2.chain_hash);
  });

  test("checksum schema validates output (SHA-256 chain_hash)", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
      session_id: SESSION,
    });

    const result = PipelineChecksumSchema.safeParse(checksum);
    expect(result.success).toBe(true);
    expect(CHECKSUM_PATTERN.test(checksum.chain_hash)).toBe(true);
  });

  test("same events produce identical chain_hash (deterministic)", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const c1 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
      session_id: SESSION,
    });
    const c2 = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
      session_id: SESSION,
    });

    expect(c1.chain_hash).toBe(c2.chain_hash);
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

describe("computePipelineReceipt", () => {
  test("builds receipt entries with matching chain hash", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated" }),
      makeEvent({ step: "payment_initiated" }),
      makeEvent({ step: "payment_confirmed" }),
      makeEvent({ step: "checkout_completed" }),
    ];

    const checksum = await computePipelineChecksum({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
      session_id: SESSION,
    });

    const receipt = await computePipelineReceipt({
      definition: PIPELINE_CHECKOUT_DIGITAL,
      events,
      session_id: SESSION,
    });

    expect(receipt.chain_hash).toBe(checksum.chain_hash);
    expect(receipt.entries.length).toBe(events.length);
    expect(receipt.missing_steps.length).toBe(0);
  });

  test("captures missing required steps", async () => {
    const events: PipelineEvent[] = [
      makeEvent({ step: "buyer_validated", pipeline_type: "checkout_physical" }),
    ];

    const receipt = await computePipelineReceipt({
      definition: PIPELINE_CHECKOUT_PHYSICAL,
      events,
      session_id: SESSION,
    });

    expect(receipt.missing_steps).toContain("address_validated");
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Registry                                                 *
 * ══════════════════════════════════════════════════════════ */

describe("Pipeline Registry", () => {
  test("has 6 pipeline definitions", () => {
    expect(PIPELINE_DEFINITIONS.length).toBe(6);
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

  test("all definition types match PipelineTypeSchema", () => {
    for (const def of PIPELINE_DEFINITIONS) {
      expect(PipelineTypeSchema.safeParse(def.type).success).toBe(true);
    }
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Emitter                                                  *
 * ══════════════════════════════════════════════════════════ */

describe("PipelineEmitter", () => {
  let emitter: PipelineEmitter;

  beforeEach(() => {
    emitter = new PipelineEmitter();
  });

  test("stores and retrieves events by session_id", async () => {
    const event = makeEvent({ step: "buyer_validated", session_id: "chk_test" });
    await emitter.emitPipelineEvent({ event });

    const events = await emitter.getPipelineEvents({ session_id: "chk_test" });
    expect(events.length).toBe(1);
    expect(events[0].step).toBe("buyer_validated");
    expect(events[0].session_id).toBe("chk_test");
  });

  test("returns empty array for unknown session_id", async () => {
    const events = await emitter.getPipelineEvents({ session_id: "nonexistent" });
    expect(events.length).toBe(0);
  });

  test("rejects invalid events via Zod validation", async () => {
    const badEvent = { step: "invalid" } as unknown as PipelineEvent;
    expect(() => emitter.emitPipelineEvent({ event: badEvent })).toThrow();
  });

  test("computes checksum for stored events", async () => {
    const sessionId = "chk_checksum";
    const steps: PipelineStep[] = [
      "buyer_validated",
      "payment_initiated",
      "payment_confirmed",
      "checkout_completed",
    ];

    for (const step of steps) {
      await emitter.emitPipelineEvent({
        event: makeEvent({ step, session_id: sessionId }),
      });
    }

    const checksum = await emitter.getPipelineChecksum({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    expect(checksum.is_valid).toBe(true);
    expect(checksum.steps_completed).toBe(4);
    expect(checksum.session_id).toBe(sessionId);
  });

  test("isolates events by session_id", async () => {
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", session_id: "chk_a" }),
    });
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "payment_initiated", session_id: "chk_b" }),
    });

    const eventsA = await emitter.getPipelineEvents({ session_id: "chk_a" });
    const eventsB = await emitter.getPipelineEvents({ session_id: "chk_b" });
    expect(eventsA.length).toBe(1);
    expect(eventsB.length).toBe(1);
    expect(eventsA[0].step).toBe("buyer_validated");
    expect(eventsB[0].step).toBe("payment_initiated");
  });

  test("filters events by pipeline_type when computing checksum", async () => {
    const sessionId = "chk_mixed";
    // Emit events for two different pipeline types under same session
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", session_id: sessionId, pipeline_type: "checkout_digital" }),
    });
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", session_id: sessionId, pipeline_type: "checkout_physical" }),
    });

    const digitalChecksum = await emitter.getPipelineChecksum({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });
    // Only 1 step completed for digital, not valid (missing payment)
    expect(digitalChecksum.steps_completed).toBe(1);
    expect(digitalChecksum.is_valid).toBe(false);
  });

  test("clear removes all events", async () => {
    await emitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", session_id: "chk_clear" }),
    });
    await emitter.clear();

    const events = await emitter.getPipelineEvents({ session_id: "chk_clear" });
    expect(events.length).toBe(0);
  });

  test("accepts custom storage backend", async () => {
    const customStorage = new InMemoryPipelineStorage();
    const customEmitter = new PipelineEmitter({ storage: customStorage });

    await customEmitter.emitPipelineEvent({
      event: makeEvent({ step: "buyer_validated", session_id: "chk_custom" }),
    });

    const events = customStorage.getBySessionId({ session_id: "chk_custom" });
    expect(events.length).toBe(1);
  });
});
