# Performance Tracing with Flame Charts

## Overview

The `@repo/tracing` package provides OpenTelemetry-compatible performance tracing for Next.js applications with flame chart visualization. This system is specifically designed to handle the complexities of Next.js App Router, React Server Components, Server Actions, and Edge runtime execution.

## Architecture

### Design Principles

Following the problem statement requirements, this tracing system implements:

1. **Flame chart timeline** as the primary visualization
2. **Span-based tracing (OpenTelemetry-compatible)** for async and cross-boundary tracking
3. **Chrome Trace Event format** for export to DevTools and Perfetto
4. **Client and server instrumentation** for comprehensive coverage

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    @repo/tracing                         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Span Model (OpenTelemetry-compatible)            │ │
│  │  • TraceId / SpanId                                │ │
│  │  • Parent-child hierarchy                          │ │
│  │  • Timing (microseconds)                           │ │
│  │  • Attributes & Events                             │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  TraceCollector                                    │ │
│  │  • In-memory storage                               │ │
│  │  • Chrome Trace Event export                       │ │
│  │  • JSON export for Perfetto/DevTools               │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Client Instrumentation                            │ │
│  │  • Navigation timing                               │ │
│  │  • Long tasks (>50ms)                              │ │
│  │  • Paint metrics (FCP, LCP)                        │ │
│  │  • Layout shifts                                   │ │
│  │  • First Input Delay                               │ │
│  │  • Resource timing                                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Server Instrumentation                            │ │
│  │  • RSC render                                      │ │
│  │  • Server Actions                                  │ │
│  │  • Route handlers                                  │ │
│  │  • Middleware                                      │ │
│  │  • Data fetching                                   │ │
│  │  • Edge vs Node runtime detection                 │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Getting Started

### Installation

The tracing package is already included in the monorepo:

```typescript
import {
  initClientTracing,
  getGlobalServerTracer,
  traceServerComponent,
} from "@repo/tracing";
```

### Client-Side Setup

Initialize client tracing in your root layout or a client component:

```typescript
// app/layout.tsx or components/tracing-provider.tsx
"use client";

import { useEffect } from "react";
import { initClientTracing } from "@repo/tracing";

export function TracingProvider({ children }) {
  useEffect(() => {
    // Initialize with default options
    initClientTracing({
      trackLongTasks: true,
      trackPaint: true,
      trackLayoutShift: true,
      trackLCP: true,
      trackFID: true,
      longTaskThreshold: 50, // ms
    });
  }, []);

  return <>{children}</>;
}
```

### Server-Side Instrumentation

#### React Server Components

Wrap your RSC rendering with tracing:

```typescript
// app/products/page.tsx
import { traceServerComponent } from "@repo/tracing";

export default async function ProductsPage() {
  return traceServerComponent("ProductsPage", async () => {
    // Your component logic
    const products = await fetchProducts();
    return <ProductsList products={products} />;
  });
}
```

#### Server Actions

Trace server actions:

```typescript
// app/actions.ts
"use server";

import { traceServerAction } from "@repo/tracing";

export async function submitCheckout(formData: FormData) {
  return traceServerAction("submitCheckout", async () => {
    // Your action logic
    const result = await processPayment(formData);
    return result;
  });
}
```

#### Route Handlers

Trace API routes:

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { traceRouteHandler } from "@repo/tracing";

export async function GET(request: NextRequest) {
  return traceRouteHandler("/api/products", "GET", async () => {
    const products = await fetchProducts();
    return NextResponse.json(products);
  });
}
```

#### Data Fetching

Trace data fetching operations:

```typescript
import { traceDataFetch } from "@repo/tracing";

async function fetchProducts() {
  return traceDataFetch("fetchProducts", async () => {
    const response = await fetch("https://api.example.com/products", {
      cache: "force-cache",
    });
    return response.json();
  }, {
    cache: "force-cache",
  });
}
```

#### Middleware

Trace middleware execution:

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import { traceMiddleware } from "@repo/tracing";

export async function middleware(request: Request) {
  return traceMiddleware("auth", async () => {
    // Your middleware logic
    const session = await getSession(request);
    if (!session) {
      return NextResponse.redirect("/login");
    }
    return NextResponse.next();
  });
}
```

## Viewing Traces

### Built-in Flame Chart Viewer

Navigate to `/tracing` in your application to view the flame chart visualization:

```
http://localhost:3000/tracing
```

Features:
- Interactive flame chart with hover tooltips
- Click to view detailed span information
- Export traces to Chrome Trace Event format
- Real-time statistics

### Export to Chrome DevTools / Perfetto

1. Visit `/tracing`
2. Click "Export to JSON"
3. Open one of these tools:
   - Chrome DevTools: chrome://tracing
   - Perfetto UI: https://ui.perfetto.dev
   - Speedscope: https://speedscope.app
4. Load the exported JSON file

### API Endpoints

#### Get Spans

```bash
GET /api/tracing?format=spans
```

Returns all collected spans in JSON format.

#### Get Statistics

```bash
GET /api/tracing?format=stats
```

Returns statistics about collected traces.

#### Export Chrome Trace Event Format

```bash
GET /api/tracing?format=json
```

Downloads traces in Chrome Trace Event format.

#### Filter by Trace ID

```bash
GET /api/tracing?format=json&traceId=abc123
```

Export only spans from a specific trace.

#### Clear All Traces

```bash
DELETE /api/tracing
```

Clears all collected traces from memory.

## Advanced Usage

### Custom Span Creation

Create and manage spans manually:

```typescript
import {
  createSpan,
  endSpan,
  setAttribute,
  addEvent,
  getGlobalCollector,
} from "@repo/tracing";

// Create a span
let span = createSpan({
  name: "Complex Operation",
  kind: "internal",
  attributes: {
    "operation.type": "batch-processing",
    "batch.size": 100,
  },
});

// Add events during execution
span = addEvent(span, {
  name: "checkpoint-1",
  timestamp: Date.now() * 1000,
  attributes: { progress: 0.5 },
});

// Add attributes
span = setAttribute(span, "result.count", 42);

// End the span
const completedSpan = endSpan(span, { code: "ok" });

// Add to collector
getGlobalCollector().addSpan(completedSpan);
```

### Traced Fetch

Use traced fetch for automatic network request tracking:

```typescript
import { createTracedFetch, getGlobalServerTracer } from "@repo/tracing";

const tracer = getGlobalServerTracer();
const tracedFetch = createTracedFetch(tracer);

// All fetch calls will be automatically traced
const response = await tracedFetch("https://api.example.com/data");
```

### Custom Collector

Create a custom collector with specific options:

```typescript
import { TraceCollector, setGlobalCollector } from "@repo/tracing";

const collector = new TraceCollector({
  processName: "my-app",
  defaultThreadName: "main",
  maxSpans: 20000, // Increase limit
});

setGlobalCollector(collector);
```

## Understanding Flame Charts

### Reading the Visualization

- **Width**: Duration of the operation
- **Y-position**: Hierarchy (parent-child relationships)
- **Color**:
  - Blue: Server-side operations
  - Green: Client-side operations
  - Orange: Internal operations
  - Purple: Async producers/consumers

### Common Patterns

#### React Server Component Hierarchy

```
┌─────────────────────────────────────┐
│ RSC: RootLayout                     │
│  ┌────────────────────────────────┐ │
│  │ RSC: ProductsPage              │ │
│  │  ┌───────────────────────────┐ │ │
│  │  │ Data: fetchProducts       │ │ │
│  │  └───────────────────────────┘ │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### Navigation Flow

```
┌──────────────────────────────────────┐
│ navigation                           │
│  ┌─┐ ┌────┐ ┌──────┐ ┌──────────┐  │
│  │D│ │TCP │ │Req   │ │DOM Proc  │  │
│  │N│ │Conn│ │Resp  │ │Load      │  │
│  │S│ │    │ │      │ │          │  │
│  └─┘ └────┘ └──────┘ └──────────┘  │
│   [LCP] [FCP]                        │
└──────────────────────────────────────┘
```

## Performance Considerations

### Memory Usage

The default collector stores up to 10,000 spans. For production:

- Use sampling (trace 1-10% of requests)
- Clear traces periodically
- Export to external storage (Honeycomb, Tempo, etc.)

### Overhead

- Client instrumentation: ~1-2ms per page load
- Server instrumentation: ~0.1-0.5ms per traced function
- Collector overhead: negligible for < 10k spans

### Best Practices

1. **Don't trace everything**: Focus on key operations
2. **Use meaningful names**: "fetchProducts" not "function1"
3. **Add relevant attributes**: Include context for debugging
4. **Sample in production**: Trace 1-10% of requests
5. **Export regularly**: Don't keep traces in memory indefinitely

## Next.js-Specific Patterns

### App Router Boundaries

The tracing system automatically detects:

- **Server Components**: Marked as `kind: "server"`
- **Client Components**: Marked as `kind: "client"`
- **Edge Runtime**: Detected via `next.runtime` attribute
- **Server Actions**: Tagged with `action.name`

### Streaming & Suspense

Spans for streaming operations:

```typescript
// Parent span for the entire stream
const streamSpan = createSpan({
  name: "RSC Stream",
  attributes: { "stream.url": "/products" },
});

// Child spans for each chunk
const chunkSpan = createSpan({
  name: "Stream Chunk",
  parentSpanId: streamSpan.spanId,
  attributes: { "chunk.index": 0 },
});
```

### Cache Hits/Misses

Track caching behavior:

```typescript
traceDataFetch("fetchProducts", async () => {
  return fetch("/api/products", {
    cache: "force-cache",
  });
}, {
  cache: "force-cache",
});
```

## Integration with Vercel

### Edge Functions

Edge runtime is automatically detected:

```typescript
// Edge API route
export const runtime = "edge";

export async function GET() {
  return traceRouteHandler("/api/edge", "GET", async () => {
    // Spans will have next.runtime="edge"
    return new Response("OK");
  });
}
```

### Vercel Analytics

Complement with Vercel Speed Insights:

```typescript
// app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Troubleshooting

### No traces appearing

1. Check that tracing is initialized: `initClientTracing()` called
2. Verify API endpoint is accessible: `/api/tracing`
3. Check console for errors
4. Ensure spans are completed (have `endTime`)

### Flame chart not rendering

1. Check browser console for canvas errors
2. Verify spans have valid timing data
3. Ensure parent-child relationships are correct

### High memory usage

1. Reduce `maxSpans` in collector options
2. Clear traces more frequently
3. Use sampling in production

## Future Enhancements

Potential additions (not implemented):

1. **Waterfall view** for network timing (complementary to flame charts)
2. **Sampling strategies** for production (trace % of requests)
3. **OpenTelemetry exporter** for vendor integration
4. **Frame markers** for jank detection
5. **Real-time updates** via WebSocket

## References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [Chrome Trace Event Format](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/)
- [Perfetto UI](https://ui.perfetto.dev)
- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)

## License

See [LICENSE](../LICENSE) file for details.
