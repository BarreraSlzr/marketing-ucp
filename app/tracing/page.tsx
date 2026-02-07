// LEGEND: Performance tracing viewer page
// Displays flame charts and trace data for Next.js performance analysis
// All usage must comply with this LEGEND and the LICENSE

"use client";

import { useEffect, useState } from "react";
import { FlameChart } from "@/components/tracing/flame-chart";
import type { Span } from "@repo/tracing";
import styles from "./page.module.css";

export default function TracingPage() {
  const [spans, setSpans] = useState<Span[]>([]);
  const [stats, setStats] = useState<{
    totalSpans: number;
    completeSpans: number;
    incompleteSpans: number;
    traceCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTraces();
  }, []);

  const loadTraces = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch spans
      const spansResponse = await fetch("/api/tracing?format=spans");
      if (!spansResponse.ok) {
        throw new Error("Failed to load traces");
      }
      const spansData = await spansResponse.json();
      setSpans(spansData.spans);

      // Fetch stats
      const statsResponse = await fetch("/api/tracing?format=stats");
      if (!statsResponse.ok) {
        throw new Error("Failed to load stats");
      }
      const statsData = await statsResponse.json();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const clearTraces = async () => {
    try {
      const response = await fetch("/api/tracing", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Failed to clear traces");
      }
      setSpans([]);
      setStats(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const exportTraces = async () => {
    try {
      const response = await fetch("/api/tracing?format=json");
      if (!response.ok) {
        throw new Error("Failed to export traces");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `trace-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Performance Tracing</h1>
        </div>
        <div className={styles.loading}>Loading traces...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Performance Tracing</h1>
        </div>
        <div className={styles.error}>Error: {error}</div>
        <button onClick={loadTraces}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Performance Tracing</h1>
        <div className={styles.actions}>
          <button onClick={loadTraces}>Refresh</button>
          <button onClick={exportTraces} disabled={spans.length === 0}>
            Export to JSON
          </button>
          <button onClick={clearTraces} disabled={spans.length === 0}>
            Clear Traces
          </button>
        </div>
      </div>

      {stats && (
        <div className={styles.stats}>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-label"]}>Total Spans</div>
            <div className={styles["stat-value"]}>{stats.totalSpans}</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-label"]}>Complete</div>
            <div className={styles["stat-value"]}>{stats.completeSpans}</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-label"]}>Incomplete</div>
            <div className={styles["stat-value"]}>{stats.incompleteSpans}</div>
          </div>
          <div className={styles["stat-card"]}>
            <div className={styles["stat-label"]}>Traces</div>
            <div className={styles["stat-value"]}>{stats.traceCount}</div>
          </div>
        </div>
      )}

      {spans.length === 0 ? (
        <div className={styles["empty-state"]}>
          <h2>No traces recorded</h2>
          <p>
            Traces will appear here automatically when you navigate through the app.
          </p>
          <p>
            To start collecting traces, enable client or server tracing in your
            application.
          </p>
        </div>
      ) : (
        <div className={styles["flame-chart-container"]}>
          <h2>Flame Chart</h2>
          <FlameChart spans={spans} height={600} />
        </div>
      )}

      <div className={styles.instructions}>
        <h3>How to use</h3>
        <ul>
          <li>
            <strong>Flame Chart:</strong> Hover over spans to see details. Click to
            select and view full information.
          </li>
          <li>
            <strong>Export:</strong> Download traces in Chrome Trace Event format for
            viewing in chrome://tracing or Perfetto UI.
          </li>
          <li>
            <strong>Colors:</strong>
            <span className={`${styles["color-legend"]} ${styles.server}`}></span> = Server,
            <span className={`${styles["color-legend"]} ${styles.client}`}></span> = Client,
            <span className={`${styles["color-legend"]} ${styles.internal}`}></span> = Internal
          </li>
        </ul>
      </div>
    </div>
  );
}
