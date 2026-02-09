import { beforeEach, describe, expect, it } from "bun:test";
import { generateDemoPipelineEvents } from "../../lib/pipeline-demo";
import { getGlobalTracker, resetGlobalTracker } from "../../lib/pipeline-tracker";

const requiredPipelineTypes = [
  "checkout_physical",
  "checkout_digital",
  "checkout_subscription",
  "checkout_physical_antifraud",
  "checkout_digital_antifraud",
  "checkout_subscription_antifraud",
] as const;

const requiredSessions = [
  "demo_antifraud_allow_001",
  "demo_subscription_antifraud_001",
  "demo_webhook_fail_001",
  "demo_address_fail_001",
  "demo_degraded_handler_001",
];

describe("Demo event matrix", () => {
  beforeEach(() => {
    resetGlobalTracker();
  });

  it("covers all pipeline types", async () => {
    const seeded = await generateDemoPipelineEvents();
    const pipelineTypes = new Set(seeded.sessions.map((session) => session.pipeline_type));

    for (const pipelineType of requiredPipelineTypes) {
      expect(pipelineTypes.has(pipelineType)).toBe(true);
    }
  });

  it("includes required demo sessions", async () => {
    const seeded = await generateDemoPipelineEvents();
    const sessionIds = new Set(seeded.sessions.map((session) => session.session_id));

    for (const sessionId of requiredSessions) {
      expect(sessionIds.has(sessionId)).toBe(true);
    }
  });

  it("includes key scenario events in the matrix", async () => {
    await generateDemoPipelineEvents();
    const tracker = getGlobalTracker();

    const webhookEvents = await tracker.getEvents({
      session_id: "demo_webhook_fail_001",
    });
    expect(
      webhookEvents.some(
        (event) => event.step === "webhook_verified" && event.status === "failure",
      ),
    ).toBe(true);

    const addressEvents = await tracker.getEvents({
      session_id: "demo_address_fail_001",
    });
    const addressRetries = addressEvents.filter(
      (event) => event.step === "address_validated",
    );
    expect(addressRetries.length).toBeGreaterThanOrEqual(2);
    expect(addressRetries.some((event) => event.status === "failure")).toBe(true);
    expect(addressRetries.some((event) => event.status === "success")).toBe(true);

    const antifraudEvents = await tracker.getEvents({
      session_id: "demo_antifraud_allow_001",
    });
    const antifraudAllow = antifraudEvents.find(
      (event) => event.step === "fraud_check" && event.status === "success",
    );
    const antifraudMetadata = antifraudAllow?.metadata as
      | Record<string, unknown>
      | undefined;
    expect(antifraudMetadata?.decision).toBe("allow");

    const degradedEvents = await tracker.getEvents({
      session_id: "demo_degraded_handler_001",
    });
    expect(
      degradedEvents.some(
        (event) =>
          event.handler === "stripe" &&
          typeof event.duration_ms === "number" &&
          event.duration_ms >= 1200,
      ),
    ).toBe(true);

    const subscriptionAntifraud = await tracker.getEvents({
      session_id: "demo_subscription_antifraud_001",
    });
    expect(
      subscriptionAntifraud.some(
        (event) => event.step === "webhook_received" && event.status === "success",
      ),
    ).toBe(true);
  });
});
