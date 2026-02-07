// LEGEND: Trace collector and Chrome Trace Event format exporter
// Collects spans and exports them in formats compatible with Chrome DevTools and Perfetto
// All usage must comply with this LEGEND and the LICENSE

import type { Span, SpanId, TraceId } from "./span";
import { durationMs, isComplete } from "./span";

/* ── Chrome Trace Event Format ───────────────────────────── */

/**
 * Chrome Trace Event format for viewing in:
 * - chrome://tracing
 * - Perfetto UI (https://ui.perfetto.dev)
 * - Speedscope (https://speedscope.app)
 */
export interface ChromeTraceEvent {
  /** Event name */
  name: string;

  /** Event category (comma-separated) */
  cat: string;

  /** Event phase: B=begin, E=end, X=complete, i=instant, etc */
  ph: "B" | "E" | "X" | "i" | "M" | "b" | "e" | "n";

  /** Timestamp in microseconds */
  ts: number;

  /** Duration in microseconds (for "X" complete events) */
  dur?: number;

  /** Process ID */
  pid: number;

  /** Thread ID */
  tid: number;

  /** Additional arguments/metadata */
  args?: Record<string, unknown>;

  /** Scope for instant events */
  s?: "t" | "p" | "g";

  /** ID for async events */
  id?: string;
}

/* ── Trace Collector ─────────────────────────────────────── */

export interface TraceCollectorOptions {
  /** Process name (default: "next-app") */
  processName?: string;

  /** Default thread name (default: "main") */
  defaultThreadName?: string;

  /** Maximum spans to store (default: 10000) */
  maxSpans?: number;
}

export class TraceCollector {
  private spans: Map<SpanId, Span> = new Map();
  private tracesByTraceId: Map<TraceId, Set<SpanId>> = new Map();
  private options: Required<TraceCollectorOptions>;
  private processId = 1;

  constructor(options: TraceCollectorOptions = {}) {
    this.options = {
      processName: options.processName ?? "next-app",
      defaultThreadName: options.defaultThreadName ?? "main",
      maxSpans: options.maxSpans ?? 10000,
    };
  }

  /** Add a span to the collector */
  addSpan(span: Span): void {
    // Enforce max spans limit (FIFO)
    if (this.spans.size >= this.options.maxSpans) {
      const oldestKey = this.spans.keys().next().value;
      if (oldestKey) {
        const oldestSpan = this.spans.get(oldestKey);
        if (oldestSpan) {
          const traceSpans = this.tracesByTraceId.get(oldestSpan.traceId);
          if (traceSpans) {
            traceSpans.delete(oldestKey);
            if (traceSpans.size === 0) {
              this.tracesByTraceId.delete(oldestSpan.traceId);
            }
          }
        }
        this.spans.delete(oldestKey);
      }
    }

    this.spans.set(span.spanId, span);

    // Track by trace ID
    let traceSpans = this.tracesByTraceId.get(span.traceId);
    if (!traceSpans) {
      traceSpans = new Set();
      this.tracesByTraceId.set(span.traceId, traceSpans);
    }
    traceSpans.add(span.spanId);
  }

  /** Get all spans */
  getSpans(): Span[] {
    return Array.from(this.spans.values());
  }

  /** Get spans by trace ID */
  getSpansByTrace(traceId: TraceId): Span[] {
    const spanIds = this.tracesByTraceId.get(traceId);
    if (!spanIds) return [];

    return Array.from(spanIds)
      .map(id => this.spans.get(id))
      .filter((s): s is Span => s !== undefined);
  }

  /** Get a single span by ID */
  getSpan(spanId: SpanId): Span | undefined {
    return this.spans.get(spanId);
  }

  /** Clear all spans */
  clear(): void {
    this.spans.clear();
    this.tracesByTraceId.clear();
  }

  /** Export spans to Chrome Trace Event format */
  exportChromeTraceEvents(options?: {
    traceId?: TraceId;
    includeIncomplete?: boolean;
  }): ChromeTraceEvent[] {
    const spans = options?.traceId
      ? this.getSpansByTrace(options.traceId)
      : this.getSpans();

    const events: ChromeTraceEvent[] = [];

    // Add process name metadata
    events.push({
      name: "process_name",
      cat: "metadata",
      ph: "M",
      pid: this.processId,
      tid: 0,
      ts: 0,
      args: { name: this.options.processName },
    });

    // Add thread name metadata
    events.push({
      name: "thread_name",
      cat: "metadata",
      ph: "M",
      pid: this.processId,
      tid: 1,
      ts: 0,
      args: { name: this.options.defaultThreadName },
    });

    // Convert spans to trace events
    for (const span of spans) {
      if (!isComplete(span) && !options?.includeIncomplete) {
        continue;
      }

      const category = this.getCategoryForSpan(span);
      const threadId = this.getThreadIdForSpan(span);
      const dur = durationMs(span);

      // Use "X" (complete) event type for completed spans
      if (isComplete(span)) {
        events.push({
          name: span.name,
          cat: category,
          ph: "X",
          ts: span.startTime,
          dur: (dur ?? 0) * 1000, // convert ms to microseconds
          pid: this.processId,
          tid: threadId,
          args: {
            ...span.attributes,
            spanId: span.spanId,
            traceId: span.traceId,
            parentSpanId: span.parentSpanId,
            kind: span.kind,
            status: span.status,
            events: span.events,
          },
        });
      } else {
        // Use "B" (begin) for incomplete spans
        events.push({
          name: span.name,
          cat: category,
          ph: "B",
          ts: span.startTime,
          pid: this.processId,
          tid: threadId,
          args: {
            ...span.attributes,
            spanId: span.spanId,
            traceId: span.traceId,
            parentSpanId: span.parentSpanId,
            kind: span.kind,
          },
        });
      }

      // Add span events as instant events
      for (const event of span.events) {
        events.push({
          name: event.name,
          cat: "event",
          ph: "i",
          ts: event.timestamp,
          pid: this.processId,
          tid: threadId,
          s: "t", // thread scope
          args: event.attributes,
        });
      }
    }

    return events;
  }

  /** Export as JSON for Chrome DevTools / Perfetto */
  exportJson(options?: {
    traceId?: TraceId;
    includeIncomplete?: boolean;
  }): string {
    const events = this.exportChromeTraceEvents(options);
    return JSON.stringify(events, null, 2);
  }

  /** Get category from span attributes or kind */
  private getCategoryForSpan(span: Span): string {
    if (span.attributes?.["trace.category"]) {
      return String(span.attributes["trace.category"]);
    }

    // Map span kind to category
    switch (span.kind) {
      case "server": return "server";
      case "client": return "client";
      case "producer": return "async";
      case "consumer": return "async";
      default: return "internal";
    }
  }

  /** Get thread ID from span attributes */
  private getThreadIdForSpan(span: Span): number {
    if (span.attributes?.["thread.id"]) {
      const tid = span.attributes["thread.id"];
      return typeof tid === "number" ? tid : 1;
    }

    // Map runtime to thread
    if (span.attributes?.["next.runtime"] === "edge") {
      return 2; // Edge runtime on thread 2
    }

    return 1; // Default main thread
  }

  /** Get statistics */
  getStats() {
    const spans = this.getSpans();
    const complete = spans.filter(isComplete);
    const incomplete = spans.filter(s => !isComplete(s));

    return {
      totalSpans: spans.length,
      completeSpans: complete.length,
      incompleteSpans: incomplete.length,
      traceCount: this.tracesByTraceId.size,
    };
  }
}

/* ── Singleton instance ──────────────────────────────────── */

let globalCollector: TraceCollector | undefined;

export function getGlobalCollector(): TraceCollector {
  if (!globalCollector) {
    globalCollector = new TraceCollector();
  }
  return globalCollector;
}

export function setGlobalCollector(collector: TraceCollector): void {
  globalCollector = collector;
}
