// LEGEND: Tests for trace collector
// All usage must comply with this LEGEND and the LICENSE

import { describe, test, expect, beforeEach } from "bun:test";
import { TraceCollector } from "../collector";
import { createSpan, endSpan } from "../span";

describe("TraceCollector", () => {
  let collector: TraceCollector;

  beforeEach(() => {
    collector = new TraceCollector();
  });

  test("adds spans to collector", () => {
    const span = createSpan({ name: "test" });
    const ended = endSpan(span);

    collector.addSpan(ended);

    const spans = collector.getSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe("test");
  });

  test("retrieves spans by trace ID", () => {
    const span1 = createSpan({ name: "span1" });
    const span2 = createSpan({
      name: "span2",
      traceId: span1.traceId,
    });

    collector.addSpan(endSpan(span1));
    collector.addSpan(endSpan(span2));

    const traceSpans = collector.getSpansByTrace(span1.traceId);
    expect(traceSpans).toHaveLength(2);
  });

  test("enforces max spans limit", () => {
    const limitedCollector = new TraceCollector({ maxSpans: 5 });

    // Add 10 spans
    for (let i = 0; i < 10; i++) {
      const span = createSpan({ name: `span-${i}` });
      limitedCollector.addSpan(endSpan(span));
    }

    // Should only keep last 5
    const spans = limitedCollector.getSpans();
    expect(spans.length).toBeLessThanOrEqual(5);
  });

  test("exports Chrome Trace Events", () => {
    const span = createSpan({
      name: "test-span",
      kind: "server",
      attributes: {
        "http.method": "GET",
      },
    });
    const ended = endSpan(span);
    collector.addSpan(ended);

    const events = collector.exportChromeTraceEvents();

    // Should have metadata + span event
    expect(events.length).toBeGreaterThan(2);

    // Find the span event
    const spanEvent = events.find(e => e.name === "test-span");
    expect(spanEvent).toBeDefined();
    expect(spanEvent?.ph).toBe("X"); // Complete event
    expect(spanEvent?.cat).toBe("server");
  });

  test("exports JSON format", () => {
    const span = createSpan({ name: "test" });
    collector.addSpan(endSpan(span));

    const json = collector.exportJson();
    const parsed = JSON.parse(json);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  test("provides statistics", () => {
    const span1 = createSpan({ name: "span1" });
    const span2 = createSpan({ name: "span2" });

    collector.addSpan(endSpan(span1));
    collector.addSpan(span2); // Incomplete

    const stats = collector.getStats();
    expect(stats.totalSpans).toBe(2);
    expect(stats.completeSpans).toBe(1);
    expect(stats.incompleteSpans).toBe(1);
  });

  test("clears all spans", () => {
    const span = createSpan({ name: "test" });
    collector.addSpan(endSpan(span));

    expect(collector.getSpans()).toHaveLength(1);

    collector.clear();

    expect(collector.getSpans()).toHaveLength(0);
    expect(collector.getStats().totalSpans).toBe(0);
  });
});
