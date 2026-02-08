import { describe, expect, it } from "bun:test";
import { createPipelineEvent, type PipelineEvent } from "../event";
import { computeHandlerHealth } from "../health";

function makeEvent(params: {
  handler: string;
  status: "success" | "failure" | "pending" | "skipped";
  timestamp: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}): PipelineEvent {
  const base = createPipelineEvent({
    session_id: "chk_health",
    pipeline_type: "checkout_digital",
    step: "payment_initiated",
    status: params.status,
    handler: params.handler,
    duration_ms: params.duration_ms,
    error: params.error,
    metadata: params.metadata,
  });

  return {
    ...base,
    timestamp: params.timestamp,
  };
}

describe("computeHandlerHealth", () => {
  it("marks handler healthy with high success rate", () => {
    const nowIso = "2026-02-08T12:00:00.000Z";
    const events = [
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:40:00.000Z",
        duration_ms: 120,
      }),
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:50:00.000Z",
        duration_ms: 140,
      }),
    ];

    const health = computeHandlerHealth({ handler: "polar", events, nowIso });
    expect(health.status).toBe("healthy");
    expect(health.success_rate).toBe(100);
    expect(health.avg_latency_ms).toBe(130);
  });

  it("marks handler degraded when success rate falls", () => {
    const nowIso = "2026-02-08T12:00:00.000Z";
    const events = [
      makeEvent({
        handler: "shopify",
        status: "success",
        timestamp: "2026-02-08T11:40:00.000Z",
      }),
      makeEvent({
        handler: "shopify",
        status: "failure",
        timestamp: "2026-02-08T11:45:00.000Z",
      }),
      makeEvent({
        handler: "shopify",
        status: "success",
        timestamp: "2026-02-08T11:55:00.000Z",
      }),
    ];

    const health = computeHandlerHealth({ handler: "shopify", events, nowIso });
    expect(health.status).toBe("degraded");
    expect(health.success_rate).toBe(67);
  });

  it("marks handler down when success rate is low", () => {
    const nowIso = "2026-02-08T12:00:00.000Z";
    const events = [
      makeEvent({
        handler: "stripe",
        status: "failure",
        timestamp: "2026-02-08T11:40:00.000Z",
      }),
      makeEvent({
        handler: "stripe",
        status: "failure",
        timestamp: "2026-02-08T11:50:00.000Z",
      }),
      makeEvent({
        handler: "stripe",
        status: "success",
        timestamp: "2026-02-08T11:55:00.000Z",
      }),
    ];

    const health = computeHandlerHealth({ handler: "stripe", events, nowIso });
    expect(health.status).toBe("down");
  });

  it("marks handler down when no recent calls", () => {
    const nowIso = "2026-02-08T12:00:00.000Z";
    const events = [
      makeEvent({
        handler: "legacy",
        status: "success",
        timestamp: "2026-02-08T08:00:00.000Z",
      }),
    ];

    const health = computeHandlerHealth({ handler: "legacy", events, nowIso });
    expect(health.status).toBe("down");
  });

  it("computes p95 latency and last error", () => {
    const nowIso = "2026-02-08T12:00:00.000Z";
    const events = [
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:40:00.000Z",
        duration_ms: 10,
      }),
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:41:00.000Z",
        duration_ms: 20,
      }),
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:42:00.000Z",
        duration_ms: 30,
      }),
      makeEvent({
        handler: "polar",
        status: "success",
        timestamp: "2026-02-08T11:43:00.000Z",
        duration_ms: 40,
      }),
      makeEvent({
        handler: "polar",
        status: "failure",
        timestamp: "2026-02-08T11:44:00.000Z",
        duration_ms: 50,
        error: "Gateway timeout",
        metadata: { error_code: "timeout" },
      }),
    ];

    const health = computeHandlerHealth({ handler: "polar", events, nowIso });
    expect(health.p95_latency_ms).toBe(50);
    expect(health.last_error?.code).toBe("timeout");
    expect(health.last_error?.message).toBe("Gateway timeout");
  });
});
