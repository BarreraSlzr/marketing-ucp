// LEGEND: Tracing package barrel exports — public API for @repo/tracing
// OpenTelemetry-compatible performance tracing for Next.js with flame chart visualization
// All usage must comply with this LEGEND and the LICENSE

/* ── Span Model ──────────────────────────────────────────── */
export {
  SpanKindSchema,
  SpanStatusSchema,
  TraceIdSchema,
  SpanIdSchema,
  SpanContextSchema,
  SpanAttributesSchema,
  SpanEventSchema,
  SpanLinkSchema,
  ResourceSchema,
  SpanSchema,
  generateTraceId,
  generateSpanId,
  nowMicros,
  duration,
  durationMs,
  isComplete,
  createSpan,
  endSpan,
  addEvent,
  setAttribute,
  type SpanKind,
  type SpanStatus,
  type TraceId,
  type SpanId,
  type SpanContext,
  type SpanAttributes,
  type SpanEvent,
  type SpanLink,
  type Resource,
  type Span,
} from "./span";

/* ── Trace Collector ─────────────────────────────────────── */
export {
  TraceCollector,
  getGlobalCollector,
  setGlobalCollector,
  type ChromeTraceEvent,
  type TraceCollectorOptions,
} from "./collector";

/* ── Client Instrumentation ──────────────────────────────── */
export {
  ClientTracer,
  getGlobalClientTracer,
  initClientTracing,
  type ClientTracingOptions,
} from "./client";

/* ── Server Instrumentation ──────────────────────────────── */
export {
  ServerTracer,
  getGlobalServerTracer,
  setGlobalServerTracer,
  createTracedFetch,
  traceServerComponent,
  traceServerAction,
  traceMiddleware,
  traceRouteHandler,
  traceDataFetch,
} from "./server";
