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

  const cards = Object.entries(grouped).map(([handler, handlerEvents]) => {
    const successes = handlerEvents.filter(
      (event) => event.status === "success",
    );
    const failures = handlerEvents.filter(
      (event) => event.status === "failure",
    );
    const withLatency = handlerEvents.filter(
      (event) => typeof event.duration_ms === "number",
    );

    const avgLatencyMs =
      withLatency.length > 0
        ? Math.round(
            withLatency.reduce(
              (sum, event) => sum + (event.duration_ms ?? 0),
              0,
            ) / withLatency.length,
          )
        : 0;

    const lastCall = handlerEvents.sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0];

    const lastError = failures.sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0];

    return {
      handler,
      total: handlerEvents.length,
      successRate:
        handlerEvents.length > 0
          ? Math.round((successes.length / handlerEvents.length) * 100)
          : 0,
      errorRate:
        handlerEvents.length > 0
          ? Math.round((failures.length / handlerEvents.length) * 100)
          : 0,
      avgLatencyMs,
      lastCallAt: lastCall?.timestamp ?? null,
      lastErrorAt: lastError?.timestamp ?? null,
      lastErrorMessage: lastError?.error ?? null,
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
                <h2>{card.handler}</h2>
                <span className={styles.pill}>{card.successRate}% success</span>
              </div>
              <div className={styles.metrics}>
                <div>
                  <p className={styles.metricLabel}>Total calls</p>
                  <p className={styles.metricValue}>{card.total}</p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Error rate</p>
                  <p className={styles.metricValue}>{card.errorRate}%</p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Avg latency</p>
                  <p className={styles.metricValue}>
                    {card.avgLatencyMs > 0 ? `${card.avgLatencyMs}ms` : "--"}
                  </p>
                </div>
              </div>
              <div className={styles.cardFooter}>
                <div>
                  <p className={styles.metricLabel}>Last call</p>
                  <p className={styles.metricValue}>
                    {formatTimestamp({ timestamp: card.lastCallAt })}
                  </p>
                </div>
                <div>
                  <p className={styles.metricLabel}>Last error</p>
                  <p className={styles.metricValue}>
                    {card.lastErrorAt
                      ? formatTimestamp({ timestamp: card.lastErrorAt })
                      : "None"}
                  </p>
                </div>
              </div>
              {card.lastErrorMessage && (
                <p className={styles.errorText}>{card.lastErrorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
