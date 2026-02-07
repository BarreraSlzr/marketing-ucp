// LEGEND: Client-side performance instrumentation for Next.js
// Captures browser performance metrics, long tasks, and navigation timing
// All usage must comply with this LEGEND and the LICENSE

import {
  createSpan,
  endSpan,
  addEvent,
  setAttribute,
  type Span,
  type SpanAttributes,
} from "./span";
import { getGlobalCollector } from "./collector";

/* ── Performance Observer Integration ────────────────────── */

export interface ClientTracingOptions {
  /** Enable long task tracking (default: true) */
  trackLongTasks?: boolean;

  /** Enable paint timing (default: true) */
  trackPaint?: boolean;

  /** Enable layout shift tracking (default: true) */
  trackLayoutShift?: boolean;

  /** Enable largest contentful paint (default: true) */
  trackLCP?: boolean;

  /** Enable first input delay (default: true) */
  trackFID?: boolean;

  /** Long task threshold in ms (default: 50) */
  longTaskThreshold?: number;

  /** Auto-collect on initialization (default: true) */
  autoCollect?: boolean;
}

export class ClientTracer {
  private options: Required<ClientTracingOptions>;
  private observers: PerformanceObserver[] = [];
  private navigationSpan?: Span;

  constructor(options: ClientTracingOptions = {}) {
    this.options = {
      trackLongTasks: options.trackLongTasks ?? true,
      trackPaint: options.trackPaint ?? true,
      trackLayoutShift: options.trackLayoutShift ?? true,
      trackLCP: options.trackLCP ?? true,
      trackFID: options.trackFID ?? true,
      longTaskThreshold: options.longTaskThreshold ?? 50,
      autoCollect: options.autoCollect ?? true,
    };

    if (this.options.autoCollect && typeof window !== "undefined") {
      this.start();
    }
  }

  /** Start performance collection */
  start(): void {
    if (typeof window === "undefined") return;

    // Create navigation span
    this.navigationSpan = this.createNavigationSpan();
    getGlobalCollector().addSpan(this.navigationSpan);

    // Track navigation timing
    this.trackNavigationTiming();

    // Track long tasks
    if (this.options.trackLongTasks) {
      this.observeLongTasks();
    }

    // Track paint timing
    if (this.options.trackPaint) {
      this.observePaint();
    }

    // Track layout shifts
    if (this.options.trackLayoutShift) {
      this.observeLayoutShift();
    }

    // Track LCP
    if (this.options.trackLCP) {
      this.observeLCP();
    }

    // Track FID
    if (this.options.trackFID) {
      this.observeFID();
    }

    // Track resource timing
    this.observeResources();
  }

  /** Stop all observers */
  stop(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
  }

  /** Create a navigation span */
  private createNavigationSpan(): Span {
    const span = createSpan({
      name: "navigation",
      kind: "client",
      attributes: {
        "navigation.url": window.location.href,
        "navigation.type": performance.navigation?.type ?? 0,
      },
    });

    return span;
  }

  /** Track navigation timing from PerformanceNavigationTiming */
  private trackNavigationTiming(): void {
    if (typeof window === "undefined" || !this.navigationSpan) return;

    // Wait for load event to get complete timing
    window.addEventListener("load", () => {
      const navTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

      if (navTiming && this.navigationSpan) {
        // Create child spans for navigation phases
        const phases = [
          { name: "DNS Lookup", start: navTiming.domainLookupStart, end: navTiming.domainLookupEnd },
          { name: "TCP Connection", start: navTiming.connectStart, end: navTiming.connectEnd },
          { name: "Request", start: navTiming.requestStart, end: navTiming.responseStart },
          { name: "Response", start: navTiming.responseStart, end: navTiming.responseEnd },
          { name: "DOM Processing", start: navTiming.domInteractive, end: navTiming.domContentLoadedEventEnd },
          { name: "Load", start: navTiming.loadEventStart, end: navTiming.loadEventEnd },
        ];

        for (const phase of phases) {
          if (phase.start > 0 && phase.end > 0) {
            const phaseSpan = createSpan({
              name: phase.name,
              kind: "client",
              traceId: this.navigationSpan.traceId,
              parentSpanId: this.navigationSpan.spanId,
              attributes: {
                "phase.duration": phase.end - phase.start,
              },
            });
            phaseSpan.startTime = Math.floor((performance.timeOrigin + phase.start) * 1000);
            const completedSpan = endSpan(phaseSpan);
            completedSpan.endTime = Math.floor((performance.timeOrigin + phase.end) * 1000);
            getGlobalCollector().addSpan(completedSpan);
          }
        }

        // Mark navigation as complete
        this.navigationSpan = endSpan(this.navigationSpan);
        getGlobalCollector().addSpan(this.navigationSpan);
      }
    });
  }

  /** Observe long tasks */
  private observeLongTasks(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= this.options.longTaskThreshold) {
            const span = createSpan({
              name: `Long Task (${Math.round(entry.duration)}ms)`,
              kind: "client",
              traceId: this.navigationSpan?.traceId,
              parentSpanId: this.navigationSpan?.spanId,
              attributes: {
                "task.duration": entry.duration,
                "task.startTime": entry.startTime,
              },
            });
            span.startTime = Math.floor((performance.timeOrigin + entry.startTime) * 1000);
            const completedSpan = endSpan(span);
            completedSpan.endTime = Math.floor((performance.timeOrigin + entry.startTime + entry.duration) * 1000);
            getGlobalCollector().addSpan(completedSpan);
          }
        }
      });

      observer.observe({ entryTypes: ["longtask"] });
      this.observers.push(observer);
    } catch (e) {
      // longtask may not be supported
      console.debug("Long task observation not supported", e);
    }
  }

  /** Observe paint timing */
  private observePaint(): void {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (this.navigationSpan) {
          this.navigationSpan = addEvent(this.navigationSpan, {
            name: entry.name,
            timestamp: Math.floor((performance.timeOrigin + entry.startTime) * 1000),
            attributes: {
              "paint.time": entry.startTime,
            },
          });
          getGlobalCollector().addSpan(this.navigationSpan);
        }
      }
    });

    observer.observe({ entryTypes: ["paint"] });
    this.observers.push(observer);
  }

  /** Observe layout shifts */
  private observeLayoutShift(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as any; // PerformanceEntry with layout shift properties
          if (this.navigationSpan && layoutShiftEntry.value) {
            this.navigationSpan = addEvent(this.navigationSpan, {
              name: "layout-shift",
              timestamp: Math.floor((performance.timeOrigin + entry.startTime) * 1000),
              attributes: {
                "cls.value": layoutShiftEntry.value,
                "cls.hadRecentInput": layoutShiftEntry.hadRecentInput,
              },
            });
            getGlobalCollector().addSpan(this.navigationSpan);
          }
        }
      });

      observer.observe({ type: "layout-shift", buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.debug("Layout shift observation not supported", e);
    }
  }

  /** Observe Largest Contentful Paint */
  private observeLCP(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry && this.navigationSpan) {
          this.navigationSpan = addEvent(this.navigationSpan, {
            name: "largest-contentful-paint",
            timestamp: Math.floor((performance.timeOrigin + lastEntry.startTime) * 1000),
            attributes: {
              "lcp.time": lastEntry.startTime,
              "lcp.size": (lastEntry as any).size,
            },
          });
          getGlobalCollector().addSpan(this.navigationSpan);
        }
      });

      observer.observe({ type: "largest-contentful-paint", buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.debug("LCP observation not supported", e);
    }
  }

  /** Observe First Input Delay */
  private observeFID(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as any; // PerformanceEventTiming
          if (this.navigationSpan && fidEntry.processingStart) {
            const fid = fidEntry.processingStart - entry.startTime;
            this.navigationSpan = addEvent(this.navigationSpan, {
              name: "first-input-delay",
              timestamp: Math.floor((performance.timeOrigin + entry.startTime) * 1000),
              attributes: {
                "fid.delay": fid,
                "fid.name": entry.name,
              },
            });
            getGlobalCollector().addSpan(this.navigationSpan);
          }
        }
      });

      observer.observe({ type: "first-input", buffered: true });
      this.observers.push(observer);
    } catch (e) {
      console.debug("FID observation not supported", e);
    }
  }

  /** Observe resource timing (network requests) */
  private observeResources(): void {
    if (!("PerformanceObserver" in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        const span = createSpan({
          name: `${resourceEntry.initiatorType}: ${this.getResourceName(resourceEntry.name)}`,
          kind: "client",
          traceId: this.navigationSpan?.traceId,
          parentSpanId: this.navigationSpan?.spanId,
          attributes: {
            "resource.url": resourceEntry.name,
            "resource.type": resourceEntry.initiatorType,
            "resource.size": resourceEntry.transferSize,
            "resource.duration": resourceEntry.duration,
          },
        });
        span.startTime = Math.floor((performance.timeOrigin + resourceEntry.startTime) * 1000);
        const completedSpan = endSpan(span);
        completedSpan.endTime = Math.floor((performance.timeOrigin + resourceEntry.startTime + resourceEntry.duration) * 1000);
        getGlobalCollector().addSpan(completedSpan);
      }
    });

    observer.observe({ entryTypes: ["resource"] });
    this.observers.push(observer);
  }

  /** Extract resource name from URL */
  private getResourceName(url: string): string {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname;
      return path.split("/").pop() || path;
    } catch {
      return url;
    }
  }
}

/* ── Singleton instance ──────────────────────────────────── */

let globalClientTracer: ClientTracer | undefined;

export function getGlobalClientTracer(): ClientTracer {
  if (!globalClientTracer && typeof window !== "undefined") {
    globalClientTracer = new ClientTracer();
  }
  return globalClientTracer!;
}

/** Initialize client tracing (call in browser only) */
export function initClientTracing(options?: ClientTracingOptions): ClientTracer {
  if (typeof window === "undefined") {
    throw new Error("initClientTracing can only be called in browser");
  }

  if (!globalClientTracer) {
    globalClientTracer = new ClientTracer(options);
  }

  return globalClientTracer;
}
