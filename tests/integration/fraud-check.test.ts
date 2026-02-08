import { assessRisk, InMemoryVelocityStorage } from "@repo/antifraud";
import type { PipelineEvent } from "@repo/pipeline/event";
import {
    createPipelineEvent,
    PipelineEventSchema,
} from "@repo/pipeline/event";
import { beforeEach, describe, expect, it } from "bun:test";

describe("Fraud Check Pipeline Integration", () => {
  let velocityStore: InMemoryVelocityStorage;
  let sessionId: string;

  beforeEach(() => {
    velocityStore = new InMemoryVelocityStorage();
    sessionId = `test-session-${Date.now()}`;
  });

  it("should allow low-risk transactions", async () => {
    const assessment = await assessRisk({
      input: {
        session_id: sessionId,
        events: [] as PipelineEvent[],
        email: "normal@example.com",
        ip: "192.168.1.1",
        billing_country: "US",
        ip_country: "US",
      },
      config: { velocityStore },
    });

    expect(assessment.decision).toBe("allow");
    expect(assessment.total_score).toBeLessThan(30);
  });

  it("should block high-risk transactions", async () => {
    const assessment = await assessRisk({
      input: {
        session_id: sessionId,
        events: [] as PipelineEvent[],
        email: "suspicious@example.com",
        ip: "10.0.0.1",
        billing_country: "US",
        ip_country: "CN",
        device_hash: "repeated-device-hash",
      },
      config: { velocityStore },
    });

    expect(assessment.decision).toBe("block");
    expect(assessment.total_score).toBeGreaterThanOrEqual(70);
  });

  it("should flag medium-risk transactions for review", async () => {
    const assessment = await assessRisk({
      input: {
        session_id: sessionId,
        events: [] as PipelineEvent[],
        email: "maybe.risky@example.com",
        ip: "203.0.113.1",
        billing_country: "US",
        ip_country: "CA",
      },
      config: { velocityStore },
    });

    expect(assessment.decision).toBe("review");
    expect(assessment.total_score).toBeGreaterThanOrEqual(30);
    expect(assessment.total_score).toBeLessThan(70);
  });

  it("should detect velocity anomalies", async () => {
    const email = "velocity.test@example.com";
    const deviceHash = "test-device-123";

    // First request
    const firstAssessment = await assessRisk({
      input: {
        session_id: `${sessionId}-1`,
        events: [] as PipelineEvent[],
        email,
        device_hash: deviceHash,
        ip: "192.168.1.100",
      },
      config: { velocityStore },
    });

    // Second request immediately after
    const secondAssessment = await assessRisk({
      input: {
        session_id: `${sessionId}-2`,
        events: [] as PipelineEvent[],
        email,
        device_hash: deviceHash,
        ip: "192.168.1.100",
      },
      config: { velocityStore },
    });

    // Second should detect higher velocity signals
    expect(secondAssessment.total_score).toBeGreaterThanOrEqual(
      firstAssessment.total_score
    );
    expect(secondAssessment.signals.some((s) => s.name.includes("velocity"))).toBe(
      true
    );
  });

  it("should detect geo-mismatch anomalies", async () => {
    const assessment = await assessRisk({
      input: {
        session_id: sessionId,
        events: [] as PipelineEvent[],
        email: "geo.test@example.com",
        ip: "203.0.113.1", // Simulated IP from one country
        billing_country: "US",
        ip_country: "KP", // Very different from billing
      },
      config: { velocityStore },
    });

    expect(assessment.signals.some((s) => s.name.includes("geo"))).toBe(true);
    expect(assessment.decision).toBe("block");
  });

  it("should create fraud_check pipeline events", async () => {
    const fraudCheckEvent = createPipelineEvent({
      session_id: sessionId,
      pipeline_type: "checkout_physical_antifraud",
      step: "fraud_check",
      status: "success",
      handler: "antifraud",
      metadata: {
        decision: "allow",
        score: 25,
        signals_count: 3,
      },
    });

    // Validate event
    const validated = PipelineEventSchema.parse(fraudCheckEvent);
    expect(validated.step).toBe("fraud_check");
    expect(validated.status).toBe("success");
    expect(validated.handler).toBe("antifraud");
    expect(validated.metadata).toBeDefined();
  });

  it("should emit fraud_review_escalated event for review decisions", async () => {
    const assessmentEvent = createPipelineEvent({
      session_id: sessionId,
      pipeline_type: "checkout_digital_antifraud",
      step: "fraud_check",
      status: "success",
      handler: "antifraud",
      metadata: { decision: "review", score: 50 },
    });

    const reviewEvent = createPipelineEvent({
      session_id: sessionId,
      pipeline_type: "checkout_digital_antifraud",
      step: "fraud_review_escalated",
      status: "pending",
      handler: "manual-review",
      metadata: { fraud_check_event_id: assessmentEvent.id },
    });

    expect(reviewEvent.step).toBe("fraud_review_escalated");
    expect(reviewEvent.status).toBe("pending");
  });

  it("should handle assessment with custom signals", async () => {
    const assessment = await assessRisk({
      input: {
        session_id: sessionId,
        events: [] as PipelineEvent[],
        email: "custom.signal@example.com",
        custom_signals: [
          {
            name: "custom_blacklist_match",
            score: 85,
            weight: 2.0,
            description: "Email matched fraud blacklist",
            detected_at: new Date().toISOString(),
          },
        ],
      },
      config: { velocityStore },
    });

    expect(assessment.decision).toBe("block");
    expect(assessment.signals.some((s) => s.name === "custom_blacklist_match")).toBe(
      true
    );
  });

  it("should validate antifraud event in pipeline registry", async () => {
    const { PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD } = await import(
      "@repo/pipeline/registry"
    );

    expect(
      PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD.required_steps.includes("fraud_check")
    ).toBe(true);
    expect(
      PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD.optional_steps.includes(
        "fraud_review_escalated"
      )
    ).toBe(true);
  });
});
