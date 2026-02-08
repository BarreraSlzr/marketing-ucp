import { getIsoTimestamp } from "@/utils/stamp";
import { computeHandlerHealth } from "@repo/pipeline";
import { getDashboardEvents } from "../data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(params: { timestamp?: string | null }): string {
  if (!params.timestamp) {
    return "--";
  }
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return "--";
  }
  return dateFormatter.format(ms);
}

export default async function HandlerHealthPage() {
  const events = await getDashboardEvents();
  const grouped = events.reduce<Record<string, typeof events>>((acc, event) => {
    const handler = event.handler ?? "unattributed";
    acc[handler] = acc[handler] ? [...acc[handler], event] : [event];
    return acc;
  }, {});

  const nowIso = getIsoTimestamp();
  const cards = Object.entries(grouped).map(([handler, handlerEvents]) => {
    const health = computeHandlerHealth({
      handler,
      events: handlerEvents,
      nowIso,
    });

    const errorHistory = handlerEvents
      .filter((event) => event.status === "failure")
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 5)
      .map((event) => ({
        timestamp: event.timestamp,
        message: event.error ?? "Unknown error",
      }));

    const nowMs = Date.parse(nowIso);
    const hourMs = 60 * 60 * 1_000;
    const buckets = Array.from({ length: 24 }, (_, index) => ({
      index,
      label: `${23 - index}h`,
      values: [] as number[],
    }));

    handlerEvents.forEach((event) => {
      if (typeof event.duration_ms !== "number") {
        return;
      }
      const delta = nowMs - Date.parse(event.timestamp);
      if (delta < 0 || delta > 24 * hourMs) {
        return;
      }
      const bucketIndex = Math.min(23, Math.max(0, Math.floor(delta / hourMs)));
      buckets[bucketIndex].values.push(event.duration_ms);
    });

    const latencySeries = buckets
      .map((bucket) => {
        if (bucket.values.length === 0) {
          return { label: bucket.label, value: 0 };
        }
        const avg =
          bucket.values.reduce((sum, value) => sum + value, 0) /
          bucket.values.length;
        return { label: bucket.label, value: Math.round(avg) };
      })
      .reverse();

    return {
      handler,
      health,
      errorHistory,
      latencySeries,
    };
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Handler telemetry</p>
          <h1 className={styles.title}>Handler Health</h1>
          <p className={styles.subtitle}>
            Monitor latency, error rates, and last call per handler.
          </p>
        </div>
      </header>

      {cards.length === 0 ? (
        <div className={styles.emptyState}>
          No handler activity recorded yet.
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {cards.map((card) => (
            <div key={card.handler} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>{card.handler}</h2>
                  <p className={styles.statusLine}>
                    <span
                      className={`${styles.statusDot} ${
                        styles[card.health.status]
                      }`}
                    />
                    {card.health.status}
                  </p>
                </div>
                <span className={styles.pill}>
                  {card.health.success_rate}% success
                </span>
              </div>
              <div className={styles.metrics}>
                <div>
                  <p className={styles.metricLabel}>Total calls</p>
                  <p className={styles.metricValue}>
                    {card.health.total_calls}
                  </p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Error rate</p>
                  <p className={styles.metricValue}>
                    {card.health.total_calls > 0
                      ? Math.round(
                          (card.health.failure_count /
                            card.health.total_calls) *
                            100,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Avg latency</p>
                  <p className={styles.metricValue}>
                    {card.health.avg_latency_ms > 0
                      ? `${card.health.avg_latency_ms}ms`
                      : "--"}
                  </p>
                </div>
                <div>
                  <p className={styles.metricLabel}>P95 latency</p>
                  <p className={styles.metricValue}>
                    {card.health.p95_latency_ms > 0
                      ? `${card.health.p95_latency_ms}ms`
                      : "--"}
                  </p>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <div>
                  <p className={styles.metricLabel}>Last call</p>
                  <p className={styles.metricValue}>
                    {formatTimestamp({
                      timestamp:
                        card.health.last_success ?? card.health.last_failure,
                    })}
                  </p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Last error</p>
                  <p className={styles.metricValue}>
                    {card.health.last_failure
                      ? formatTimestamp({ timestamp: card.health.last_failure })
                      : "None"}
                  </p>
                </div>
              </div>
              {card.health.last_error && (
                <p className={styles.errorText}>
                  {card.health.last_error.message}
                </p>
              )}
              <details className={styles.details}>
                <summary className={styles.summary}>
                  View handler history
                </summary>
                <div className={styles.detailGrid}>
                  <div className={styles.detailPanel}>
                    <h3>Latency (24h)</h3>
                    <div className={styles.latencyChart}>
                      {card.latencySeries.map((point) => (
                        <div key={point.label} className={styles.latencyBar}>
                          <span
                            className={styles.latencyFill}
                            style={{
                              height: `${Math.min(point.value / 10, 100)}%`,
                            }}
                          />
                          <span className={styles.latencyLabel}>
                            {point.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.detailPanel}>
                    <h3>Error history</h3>
                    {card.errorHistory.length === 0 ? (
                      <p className={styles.emptyState}>No errors recorded.</p>
                    ) : (
                      <ul className={styles.errorList}>
                        {card.errorHistory.map((item, index) => (
                          <li key={`${item.timestamp}-${index}`}>
                            <span>
                              {formatTimestamp({ timestamp: item.timestamp })}
                            </span>
                            <span>{item.message}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
