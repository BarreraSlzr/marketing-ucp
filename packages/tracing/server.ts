// LEGEND: Server-side performance instrumentation for Next.js
// Captures RSC render, fetch, Server Actions, and Edge runtime execution
// All usage must comply with this LEGEND and the LICENSE

import {
  createSpan,
  endSpan,
  setAttribute,
  type Span,
  type SpanAttributes,
  type TraceId,
  type SpanId,
} from "./span";
import { getGlobalCollector } from "./collector";

/* ── Server Tracing Context ──────────────────────────────── */

/**
 * Server-side tracing context for Next.js
 * Works with App Router, RSC, and Server Actions
 */
export class ServerTracer {
  private activeSpans = new Map<string, Span>();

  /** Start a server span */
  startSpan(params: {
    name: string;
    attributes?: SpanAttributes;
    traceId?: TraceId;
    parentSpanId?: SpanId;
  }): Span {
    const span = createSpan({
      name: params.name,
      kind: "server",
      attributes: {
        ...params.attributes,
        "next.runtime": this.detectRuntime(),
      },
      traceId: params.traceId,
      parentSpanId: params.parentSpanId,
    });

    this.activeSpans.set(span.spanId, span);
    return span;
  }

  /** End a span */
  endSpan(span: Span, attributes?: SpanAttributes): Span {
    let updatedSpan = span;
    if (attributes) {
      for (const [key, value] of Object.entries(attributes)) {
        updatedSpan = setAttribute(updatedSpan, key, value);
      }
    }

    const completedSpan = endSpan(updatedSpan);
    this.activeSpans.delete(span.spanId);
    getGlobalCollector().addSpan(completedSpan);

    return completedSpan;
  }

  /** Get active span */
  getActiveSpan(spanId: SpanId): Span | undefined {
    return this.activeSpans.get(spanId);
  }

  /** Detect runtime environment */
  private detectRuntime(): "edge" | "nodejs" {
    // Check for Edge Runtime
    if (typeof EdgeRuntime !== "undefined") {
      return "edge";
    }
    return "nodejs";
  }

  /** Wrap an async function with tracing */
  async trace<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      attributes?: SpanAttributes;
      traceId?: TraceId;
      parentSpanId?: SpanId;
    }
  ): Promise<T> {
    const span = this.startSpan({
      name,
      attributes: options?.attributes,
      traceId: options?.traceId,
      parentSpanId: options?.parentSpanId,
    });

    try {
      const result = await fn(span);
      this.endSpan(span);
      return result;
    } catch (error) {
      const errorSpan = endSpan(span, {
        code: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      getGlobalCollector().addSpan(errorSpan);
      throw error;
    }
  }

  /** Wrap a synchronous function with tracing */
  traceSync<T>(
    name: string,
    fn: (span: Span) => T,
    options?: {
      attributes?: SpanAttributes;
      traceId?: TraceId;
      parentSpanId?: SpanId;
    }
  ): T {
    const span = this.startSpan({
      name,
      attributes: options?.attributes,
      traceId: options?.traceId,
      parentSpanId: options?.parentSpanId,
    });

    try {
      const result = fn(span);
      this.endSpan(span);
      return result;
    } catch (error) {
      const errorSpan = endSpan(span, {
        code: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      getGlobalCollector().addSpan(errorSpan);
      throw error;
    }
  }
}

/* ── Instrumented Fetch ──────────────────────────────────── */

/**
 * Wrap fetch with automatic tracing
 */
export function createTracedFetch(tracer: ServerTracer, parentSpan?: Span) {
  return async function tracedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";

    return tracer.trace(
      `fetch ${method} ${url}`,
      async (span) => {
        span = setAttribute(span, "http.method", method);
        span = setAttribute(span, "http.url", url);

        const startTime = Date.now();
        const response = await fetch(input, init);
        const duration = Date.now() - startTime;

        span = setAttribute(span, "http.status", response.status);
        span = setAttribute(span, "http.duration", duration);

        return response;
      },
      {
        traceId: parentSpan?.traceId,
        parentSpanId: parentSpan?.spanId,
      }
    );
  };
}

/* ── React Server Component Tracing ──────────────────────── */

/**
 * Trace a React Server Component render
 */
export async function traceServerComponent<T>(
  componentName: string,
  renderFn: () => Promise<T> | T,
  tracer?: ServerTracer
): Promise<T> {
  const serverTracer = tracer ?? getGlobalServerTracer();

  return serverTracer.trace(
    `RSC: ${componentName}`,
    async (span) => {
      span = setAttribute(span, "component.type", "server");
      span = setAttribute(span, "component.name", componentName);

      return await renderFn();
    }
  );
}

/**
 * Trace a Server Action
 */
export async function traceServerAction<T>(
  actionName: string,
  actionFn: () => Promise<T>,
  tracer?: ServerTracer
): Promise<T> {
  const serverTracer = tracer ?? getGlobalServerTracer();

  return serverTracer.trace(
    `Action: ${actionName}`,
    async (span) => {
      span = setAttribute(span, "action.name", actionName);

      return await actionFn();
    }
  );
}

/* ── Middleware Tracing ──────────────────────────────────── */

/**
 * Trace middleware execution
 */
export async function traceMiddleware<T>(
  middlewareName: string,
  middlewareFn: () => Promise<T>,
  tracer?: ServerTracer
): Promise<T> {
  const serverTracer = tracer ?? getGlobalServerTracer();

  return serverTracer.trace(
    `Middleware: ${middlewareName}`,
    async (span) => {
      span = setAttribute(span, "middleware.name", middlewareName);

      return await middlewareFn();
    }
  );
}

/* ── Route Handler Tracing ───────────────────────────────── */

/**
 * Trace a Next.js route handler
 */
export async function traceRouteHandler<T>(
  route: string,
  method: string,
  handlerFn: () => Promise<T>,
  tracer?: ServerTracer
): Promise<T> {
  const serverTracer = tracer ?? getGlobalServerTracer();

  return serverTracer.trace(
    `${method} ${route}`,
    async (span) => {
      span = setAttribute(span, "http.method", method);
      span = setAttribute(span, "http.route", route);

      return await handlerFn();
    }
  );
}

/* ── Data Fetching Tracing ───────────────────────────────── */

/**
 * Trace data fetching operations
 */
export async function traceDataFetch<T>(
  fetchName: string,
  fetchFn: () => Promise<T>,
  options?: {
    cache?: RequestCache;
    tracer?: ServerTracer;
  }
): Promise<T> {
  const serverTracer = options?.tracer ?? getGlobalServerTracer();

  return serverTracer.trace(
    `Data: ${fetchName}`,
    async (span) => {
      span = setAttribute(span, "data.operation", fetchName);
      if (options?.cache) {
        span = setAttribute(span, "data.cache", options.cache);
      }

      return await fetchFn();
    }
  );
}

/* ── Singleton instance ──────────────────────────────────── */

let globalServerTracer: ServerTracer | undefined;

export function getGlobalServerTracer(): ServerTracer {
  if (!globalServerTracer) {
    globalServerTracer = new ServerTracer();
  }
  return globalServerTracer;
}

export function setGlobalServerTracer(tracer: ServerTracer): void {
  globalServerTracer = tracer;
}
