// LEGEND: Tests for span model and basic tracing functionality
// All usage must comply with this LEGEND and the LICENSE

import { describe, test, expect } from "bun:test";
import {
  createSpan,
  endSpan,
  addEvent,
  setAttribute,
  generateTraceId,
  generateSpanId,
  duration,
  durationMs,
  isComplete,
} from "../span";

describe("Span Model", () => {
  test("generateTraceId creates 32-char hex string", () => {
    const traceId = generateTraceId();
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  test("generateSpanId creates 16-char hex string", () => {
    const spanId = generateSpanId();
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  test("createSpan creates valid span", () => {
    const span = createSpan({
      name: "test-span",
      kind: "internal",
      attributes: {
        "test.key": "test-value",
      },
    });

    expect(span.name).toBe("test-span");
    expect(span.kind).toBe("internal");
    expect(span.startTime).toBeGreaterThan(0);
    expect(span.endTime).toBeUndefined();
    expect(span.status.code).toBe("unset");
    expect(span.attributes?.["test.key"]).toBe("test-value");
  });

  test("endSpan sets endTime and status", () => {
    const span = createSpan({ name: "test" });
    const ended = endSpan(span, { code: "ok" });

    expect(ended.endTime).toBeDefined();
    expect(ended.endTime).toBeGreaterThan(span.startTime);
    expect(ended.status.code).toBe("ok");
  });

  test("addEvent adds event to span", () => {
    let span = createSpan({ name: "test" });
    span = addEvent(span, {
      name: "checkpoint",
      timestamp: Date.now() * 1000,
      attributes: { progress: 0.5 },
    });

    expect(span.events).toHaveLength(1);
    expect(span.events[0].name).toBe("checkpoint");
  });

  test("setAttribute adds attribute to span", () => {
    let span = createSpan({ name: "test" });
    span = setAttribute(span, "new.key", "new-value");

    expect(span.attributes?.["new.key"]).toBe("new-value");
  });

  test("duration calculates span duration in microseconds", () => {
    const span = createSpan({ name: "test" });
    const ended = endSpan(span);

    const dur = duration(ended);
    expect(dur).toBeGreaterThanOrEqual(0);
  });

  test("durationMs calculates span duration in milliseconds", () => {
    const span = createSpan({ name: "test" });
    const ended = endSpan(span);

    const dur = durationMs(ended);
    expect(dur).toBeGreaterThanOrEqual(0);
  });

  test("isComplete returns true for ended spans", () => {
    const span = createSpan({ name: "test" });
    expect(isComplete(span)).toBe(false);

    const ended = endSpan(span);
    expect(isComplete(ended)).toBe(true);
  });

  test("parent-child relationship", () => {
    const parent = createSpan({ name: "parent" });
    const child = createSpan({
      name: "child",
      traceId: parent.traceId,
      parentSpanId: parent.spanId,
    });

    expect(child.traceId).toBe(parent.traceId);
    expect(child.parentSpanId).toBe(parent.spanId);
  });
});
