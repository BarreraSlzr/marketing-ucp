// LEGEND: Risk engine integration tests — validates end-to-end assessment flow
// All usage must comply with this LEGEND and the LICENSE

import { beforeEach, describe, expect, it } from "bun:test";
import type { PipelineEvent } from "../../pipeline/event";
import type { AssessmentInput } from "../risk-engine";
import { assessRisk } from "../risk-engine";
import { InMemoryVelocityStorage } from "../velocity-store";

/* ── Helpers ─────────────────────────────────────────────── */

function makeEvent(params: {
  step: string;
  timestamp: string;
  status?: string;
  input_checksum?: string;
}): PipelineEvent {
  return {
    id: `sess.checkout_physical.${params.step}.0`,
    session_id: "sess_001",
    pipeline_type: "checkout_physical",
    step: params.step,
    sequence: 0,
    status: params.status ?? "success",
    timestamp: params.timestamp,
    input_checksum: params.input_checksum,
  } as PipelineEvent;
}

describe("Risk Engine — assessRisk", () => {
  let velocityStore: InMemoryVelocityStorage;

  beforeEach(() => {
    velocityStore = new InMemoryVelocityStorage({ windowMs: 60_000 });
  });

  it("returns allow for clean checkout", async () => {
    const now = Date.now();
    const input: AssessmentInput = {
      session_id: "sess_001",
      events: [
        makeEvent({ step: "buyer_validated", timestamp: new Date(now).toISOString() }),
        makeEvent({ step: "payment_confirmed", timestamp: new Date(now + 30_000).toISOString() }),
      ],
      email: "newuser@example.com",
    };

    const assessment = await assessRisk({ input, config: { velocityStore } });

    expect(assessment.decision).toBe("allow");
    expect(assessment.total_score).toBeLessThanOrEqual(30);
    expect(assessment.session_id).toBe("sess_001");
    expect(assessment.assessed_at).toBeTruthy();
  });

  it("returns block for high-risk checkout", async () => {
    const now = Date.now();

    // Create high velocity
    for (let i = 0; i < 10; i++) {
      await velocityStore.record({
        key: "fraud@example.com",
        key_type: "email",
        session_id: `sess_${i}`,
      });
    }

    const input: AssessmentInput = {
      session_id: "sess_10",
      events: [
        makeEvent({ step: "buyer_validated", timestamp: new Date(now).toISOString() }),
        makeEvent({ step: "checkout_completed", timestamp: new Date(now + 500).toISOString() }),
      ],
      email: "fraud@example.com",
      billing_country: "US",
      ip_country: "NG",
      previous_chain_hash: "hash_before",
      current_chain_hash: "hash_after",
      device_fingerprint: {
        webgl_renderer: "Google SwiftShader",
        user_agent: "Mozilla/5.0 (iPhone)",
        max_touch_points: 0,
      },
    };

    const assessment = await assessRisk({ input, config: { velocityStore } });

    expect(assessment.decision).not.toBe("allow");
    expect(assessment.signals.length).toBeGreaterThan(0);
  });

  it("includes custom signals in assessment", async () => {
    const input: AssessmentInput = {
      session_id: "sess_001",
      events: [],
      custom_signals: [
        { signal: "custom_blocklist", score: 100, reason: "Email on blocklist", weight: 2.0 },
      ],
    };

    const assessment = await assessRisk({ input, config: { velocityStore } });

    expect(assessment.signals.some((s) => s.signal === "custom_blocklist")).toBe(true);
  });

  it("returns valid RiskAssessment schema", async () => {
    const input: AssessmentInput = {
      session_id: "sess_schema",
      events: [],
    };

    const assessment = await assessRisk({ input, config: { velocityStore } });

    // Should not throw — already parsed by Zod inside assessRisk
    expect(assessment.session_id).toBe("sess_schema");
    expect(typeof assessment.total_score).toBe("number");
    expect(["allow", "review", "block"]).toContain(assessment.decision);
    expect(Array.isArray(assessment.signals)).toBe(true);
    expect(assessment.assessed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("respects custom thresholds", async () => {
    const input: AssessmentInput = {
      session_id: "sess_001",
      events: [],
      custom_signals: [
        { signal: "test", score: 20, reason: "Slightly risky", weight: 1.0 },
      ],
    };

    // With very low allow threshold, 20 should be "review"
    const assessment = await assessRisk({
      input,
      config: {
        velocityStore,
        allowThreshold: 10,
        blockThreshold: 50,
      },
    });

    expect(assessment.decision).toBe("review");
  });
});
