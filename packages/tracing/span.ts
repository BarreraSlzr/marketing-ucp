// LEGEND: OpenTelemetry-compatible span model for Next.js performance tracing
// Provides hierarchical execution tracking with flame chart visualization
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";

/* ── Span Kind ───────────────────────────────────────────── */

export const SpanKindSchema = z.enum([
  "internal",    // Internal operation (React render, data processing)
  "server",      // Server-side request handling
  "client",      // Client-side operation
  "producer",    // Async job producer
  "consumer",    // Async job consumer
]);

export type SpanKind = z.infer<typeof SpanKindSchema>;

/* ── Span Status ─────────────────────────────────────────── */

export const SpanStatusSchema = z.object({
  code: z.enum(["unset", "ok", "error"]),
  message: z.string().optional(),
});

export type SpanStatus = z.infer<typeof SpanStatusSchema>;

/* ── Trace & Span IDs ────────────────────────────────────── */

// 16-byte hex string (32 characters)
export const TraceIdSchema = z.string().regex(/^[0-9a-f]{32}$/);
export type TraceId = z.infer<typeof TraceIdSchema>;

// 8-byte hex string (16 characters)
export const SpanIdSchema = z.string().regex(/^[0-9a-f]{16}$/);
export type SpanId = z.infer<typeof SpanIdSchema>;

/* ── Span Context ────────────────────────────────────────── */

export const SpanContextSchema = z.object({
  traceId: TraceIdSchema,
  spanId: SpanIdSchema,
  parentSpanId: SpanIdSchema.optional(),
  traceFlags: z.number().int().min(0).max(255).default(1), // 1 = sampled
});

export type SpanContext = z.infer<typeof SpanContextSchema>;

/* ── Span Attributes ─────────────────────────────────────── */

export const SpanAttributesSchema = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
);

export type SpanAttributes = z.infer<typeof SpanAttributesSchema>;

/* ── Span Event ──────────────────────────────────────────── */

export const SpanEventSchema = z.object({
  name: z.string(),
  timestamp: z.number(), // microseconds since Unix epoch
  attributes: SpanAttributesSchema.optional(),
});

export type SpanEvent = z.infer<typeof SpanEventSchema>;

/* ── Span Link ───────────────────────────────────────────── */

export const SpanLinkSchema = z.object({
  context: SpanContextSchema,
  attributes: SpanAttributesSchema.optional(),
});

export type SpanLink = z.infer<typeof SpanLinkSchema>;

/* ── Resource ────────────────────────────────────────────── */

export const ResourceSchema = z.object({
  attributes: SpanAttributesSchema,
});

export type Resource = z.infer<typeof ResourceSchema>;

/* ── Main Span Schema ────────────────────────────────────── */

export const SpanSchema = z.object({
  // OpenTelemetry Core Fields
  traceId: TraceIdSchema,
  spanId: SpanIdSchema,
  parentSpanId: SpanIdSchema.optional(),
  name: z.string().min(1),
  kind: SpanKindSchema,

  // Timing (all in microseconds since Unix epoch)
  startTime: z.number(),
  endTime: z.number().optional(), // undefined means span is still active

  // Status
  status: SpanStatusSchema,

  // Metadata
  attributes: SpanAttributesSchema.optional(),
  events: z.array(SpanEventSchema).default([]),
  links: z.array(SpanLinkSchema).default([]),

  // Next.js Specific
  resource: ResourceSchema.optional(),
});

export type Span = z.infer<typeof SpanSchema>;

/* ── Helpers ─────────────────────────────────────────────── */

/** Generate a random trace ID (16 bytes = 32 hex chars) */
export function generateTraceId(): TraceId {
  const bytes = new Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Generate a random span ID (8 bytes = 16 hex chars) */
export function generateSpanId(): SpanId {
  const bytes = new Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Get current time in microseconds since Unix epoch */
export function nowMicros(): number {
  if (typeof performance !== 'undefined' && performance.timeOrigin) {
    // Browser: use performance.now() for high resolution
    return Math.floor((performance.timeOrigin + performance.now()) * 1000);
  }
  // Node: use Date.now()
  return Date.now() * 1000;
}

/** Calculate duration in microseconds */
export function duration(span: Span): number | undefined {
  if (!span.endTime) return undefined;
  return span.endTime - span.startTime;
}

/** Calculate duration in milliseconds */
export function durationMs(span: Span): number | undefined {
  const d = duration(span);
  return d !== undefined ? d / 1000 : undefined;
}

/** Check if span is complete */
export function isComplete(span: Span): boolean {
  return span.endTime !== undefined;
}

/** Create a new span */
export function createSpan(params: {
  name: string;
  kind?: SpanKind;
  traceId?: TraceId;
  parentSpanId?: SpanId;
  attributes?: SpanAttributes;
  resource?: Resource;
}): Span {
  const traceId = params.traceId ?? generateTraceId();
  const spanId = generateSpanId();

  return SpanSchema.parse({
    traceId,
    spanId,
    parentSpanId: params.parentSpanId,
    name: params.name,
    kind: params.kind ?? "internal",
    startTime: nowMicros(),
    status: { code: "unset" },
    attributes: params.attributes,
    events: [],
    links: [],
    resource: params.resource,
  });
}

/** End a span */
export function endSpan(span: Span, status?: SpanStatus): Span {
  return {
    ...span,
    endTime: nowMicros(),
    status: status ?? { code: "ok" },
  };
}

/** Add event to span */
export function addEvent(span: Span, event: SpanEvent): Span {
  return {
    ...span,
    events: [...span.events, event],
  };
}

/** Add attribute to span */
export function setAttribute(span: Span, key: string, value: string | number | boolean | string[]): Span {
  return {
    ...span,
    attributes: {
      ...span.attributes,
      [key]: value,
    },
  };
}
