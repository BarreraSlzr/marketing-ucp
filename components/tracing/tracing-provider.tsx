// LEGEND: Example tracing integration for Next.js app
// Shows how to enable client and server tracing in a real application
// All usage must comply with this LEGEND and the LICENSE

"use client";

import { useEffect } from "react";
import { initClientTracing } from "@repo/tracing";

/**
 * TracingProvider enables client-side performance monitoring
 *
 * Add this to your root layout to enable tracing:
 *
 * ```tsx
 * // app/layout.tsx
 * import { TracingProvider } from "@/components/tracing-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <TracingProvider>
 *           {children}
 *         </TracingProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function TracingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only enable in development or when explicitly enabled
    const enableTracing =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_ENABLE_TRACING === "true";

    if (!enableTracing) return;

    // Initialize client tracing
    initClientTracing({
      // Track tasks longer than 50ms
      trackLongTasks: true,
      longTaskThreshold: 50,

      // Track Core Web Vitals
      trackPaint: true,         // FCP, FP
      trackLCP: true,           // Largest Contentful Paint
      trackFID: true,           // First Input Delay
      trackLayoutShift: true,   // Cumulative Layout Shift

      // Auto-collect on initialization
      autoCollect: true,
    });

    console.log("[Tracing] Client instrumentation enabled");
  }, []);

  return <>{children}</>;
}
