# @repo/tracing

OpenTelemetry-compatible performance tracing for Next.js with flame chart visualization.

## Overview

This package provides span-based tracing specifically designed for Next.js App Router, React Server Components, and Edge runtime. It includes:

- OpenTelemetry-compatible span data model
- Client-side instrumentation (long tasks, paint metrics, layout shifts)
- Server-side instrumentation (RSC, Server Actions, middleware)
- Chrome Trace Event format export
- In-memory trace collector

## Quick Start

```typescript
import {
  initClientTracing,
  traceServerComponent,
  traceServerAction,
} from "@repo/tracing";

// Client-side (browser)
initClientTracing({
  trackLongTasks: true,
  trackLCP: true,
});

// Server-side (RSC)
export default async function MyPage() {
  return traceServerComponent("MyPage", async () => {
    return <div>Hello</div>;
  });
}

// Server Actions
export async function myAction() {
  "use server";
  return traceServerAction("myAction", async () => {
    // action logic
  });
}
```

## Features

### Span Model

- TraceId (16 bytes) and SpanId (8 bytes)
- Parent-child hierarchy
- Microsecond precision timing
- Attributes, events, and links
- Status tracking (ok/error/unset)

### Client Instrumentation

Automatically captures:
- Navigation timing
- Long tasks (>50ms)
- Paint metrics (FCP, LCP)
- Layout shifts (CLS)
- First Input Delay (FID)
- Resource timing (network requests)

### Server Instrumentation

Helper functions for:
- React Server Components
- Server Actions
- Route handlers
- Middleware
- Data fetching
- Edge vs Node runtime detection

### Export Formats

- JSON (Chrome Trace Event format)
- Viewable in:
  - chrome://tracing
  - Perfetto UI (https://ui.perfetto.dev)
  - Speedscope (https://speedscope.app)

## API

### Core Types

```typescript
interface Span {
  traceId: TraceId;
  spanId: SpanId;
  parentSpanId?: SpanId;
  name: string;
  kind: "internal" | "server" | "client" | "producer" | "consumer";
  startTime: number; // microseconds
  endTime?: number; // microseconds
  status: { code: "unset" | "ok" | "error"; message?: string };
  attributes?: Record<string, string | number | boolean | string[]>;
  events?: SpanEvent[];
}
```

### Client API

```typescript
// Initialize client tracing
initClientTracing(options?: ClientTracingOptions): ClientTracer

interface ClientTracingOptions {
  trackLongTasks?: boolean;
  trackPaint?: boolean;
  trackLayoutShift?: boolean;
  trackLCP?: boolean;
  trackFID?: boolean;
  longTaskThreshold?: number; // default: 50ms
}
```

### Server API

```typescript
// Trace a server component
traceServerComponent<T>(
  componentName: string,
  renderFn: () => Promise<T> | T
): Promise<T>

// Trace a server action
traceServerAction<T>(
  actionName: string,
  actionFn: () => Promise<T>
): Promise<T>

// Trace a route handler
traceRouteHandler<T>(
  route: string,
  method: string,
  handlerFn: () => Promise<T>
): Promise<T>

// Trace middleware
traceMiddleware<T>(
  middlewareName: string,
  middlewareFn: () => Promise<T>
): Promise<T>

// Trace data fetch
traceDataFetch<T>(
  fetchName: string,
  fetchFn: () => Promise<T>,
  options?: { cache?: RequestCache }
): Promise<T>
```

### Collector API

```typescript
// Get global collector
getGlobalCollector(): TraceCollector

// Export traces
collector.exportJson(options?: {
  traceId?: TraceId;
  includeIncomplete?: boolean;
}): string

// Get statistics
collector.getStats(): {
  totalSpans: number;
  completeSpans: number;
  incompleteSpans: number;
  traceCount: number;
}

// Clear all traces
collector.clear(): void
```

## Integration

### With Next.js App Router

```typescript
// app/layout.tsx
import { TracingProvider } from "@/components/tracing-provider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <TracingProvider>
          {children}
        </TracingProvider>
      </body>
    </html>
  );
}
```

### With API Routes

```typescript
// app/api/tracing/route.ts
import { getGlobalCollector } from "@repo/tracing";

export async function GET() {
  const collector = getGlobalCollector();
  const json = collector.exportJson();
  return new Response(json, {
    headers: { "Content-Type": "application/json" },
  });
}
```

## Visualization

View traces at `/tracing` in your app or export to:

- **Chrome DevTools**: Open chrome://tracing and load JSON
- **Perfetto UI**: Visit https://ui.perfetto.dev and load JSON
- **Speedscope**: Visit https://speedscope.app and load JSON

## Performance

- Client overhead: ~1-2ms per page
- Server overhead: ~0.1-0.5ms per traced function
- Memory: ~10KB per 100 spans

## Best Practices

1. Sample in production (trace 1-10% of requests)
2. Use descriptive span names
3. Add relevant attributes for debugging
4. Clear traces periodically
5. Export to external storage for long-term retention

## See Also

- [Full Documentation](../../docs/performance-tracing.md)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [Chrome Trace Event Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/)
