import { Link } from "@/i18n/navigation";
import { getIsoTimestamp } from "@/utils/stamp";
import type { PipelineEvent } from "@repo/pipeline";
import { getDashboardSessions } from "./data";
import { DemoControls } from "./demo-controls";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function isPipelineCompleted(params: { events: PipelineEvent[] }): boolean {
  return params.events.some(
    (event) =>
      event.step === "checkout_completed" && event.status === "success",
  );
}

function getLatestFailure(params: {
  events: PipelineEvent[];
}): PipelineEvent | null {
  const failures = params.events.filter((event) => event.status === "failure");
  if (failures.length === 0) {
    return null;
  }
  return failures.sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  )[0];
}

function formatDuration(params: { durationMs: number }): string {
  const seconds = Math.round(params.durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTime(params: { timestamp?: string | null }): string {
  if (!params.timestamp) {
    return "--";
  }
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return "--";
  }
  return timeFormatter.format(ms);
}

function formatDateTime(params: { timestamp?: string | null }): string {
  if (!params.timestamp) {
    return "--";
  }
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return "--";
  }
  return dateTimeFormatter.format(ms);
}

export default async function DashboardPage() {
  const sessions = await getDashboardSessions();
  const allEvents = sessions.flatMap((session) => session.events);
  const nowMs = Date.parse(getIsoTimestamp());
  const dayMs = 24 * 60 * 60 * 1000;

  const activePipelines = sessions.filter(
    (session) => !isPipelineCompleted({ events: session.events }),
  ).length;

  const recentSessions = sessions.filter(
    (session) => Date.parse(session.last_updated) >= nowMs - dayMs,
  );

  const completedRecent = recentSessions.filter((session) =>
    isPipelineCompleted({ events: session.events }),
  ).length;

  const completionRate =
    recentSessions.length > 0
      ? Math.round((completedRecent / recentSessions.length) * 100)
      : 0;

  const durations = sessions
    .map((session) => {
      const start = Date.parse(session.events[0].timestamp);
      const end = Date.parse(
        session.events[session.events.length - 1].timestamp,
      );
      return end >= start ? end - start : 0;
    })
    .filter((duration) => duration > 0);

  const avgDurationMs =
    durations.length > 0
      ? Math.round(
          durations.reduce((sum, value) => sum + value, 0) / durations.length,
        )
      : 0;

  const handlerStats = allEvents.reduce<Record<string, PipelineEvent[]>>(
    (acc, event) => {
      const handler = event.handler ?? "unattributed";
      acc[handler] = acc[handler] ? [...acc[handler], event] : [event];
      return acc;
    },
    {},
  );

  const handlerCards = Object.entries(handlerStats).map(([handler, events]) => {
    const successes = events.filter((event) => event.status === "success");
    const failures = events.filter((event) => event.status === "failure");
    const avgLatency = events.filter(
      (event) => typeof event.duration_ms === "number",
    );

    const avgLatencyMs =
      avgLatency.length > 0
        ? Math.round(
            avgLatency.reduce(
              (sum, event) => sum + (event.duration_ms ?? 0),
              0,
            ) / avgLatency.length,
          )
        : 0;

    const lastSuccess = successes.sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0];
    const lastError = failures.sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0];

    return {
      handler,
      total: events.length,
      successRate:
        events.length > 0
          ? Math.round((successes.length / events.length) * 100)
          : 0,
      avgLatencyMs,
      lastSuccessAt: lastSuccess?.timestamp ?? null,
      lastErrorAt: lastError?.timestamp ?? null,
      lastErrorMessage: lastError?.error ?? null,
    };
  });

  const recentFailures = sessions
    .map((session) => ({
      session,
      failure: getLatestFailure({ events: session.events }),
    }))
    .filter((entry) => entry.failure !== null)
    .sort(
      (a, b) =>
        Date.parse(b.failure?.timestamp ?? "") -
        Date.parse(a.failure?.timestamp ?? ""),
    )
    .slice(0, 5);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pipeline confidence view</p>
          <h1 className={styles.title}>UCP Observability Dashboard</h1>
        </div>
        <div className={styles.headerActions}>
          <DemoControls />
        </div>
      </header>

      <section className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Active pipelines</p>
          <p className={styles.metricValue}>{activePipelines}</p>
          <p className={styles.metricHint}>In-progress checkouts</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Completion rate</p>
          <p className={styles.metricValue}>{completionRate}%</p>
          <p className={styles.metricHint}>Last 24 hours</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Avg pipeline duration</p>
          <p className={styles.metricValue}>
            {avgDurationMs > 0
              ? formatDuration({ durationMs: avgDurationMs })
              : "--"}
          </p>
          <p className={styles.metricHint}>First step to last step</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Events tracked</p>
          <p className={styles.metricValue}>{allEvents.length}</p>
          <p className={styles.metricHint}>Across all pipelines</p>
        </div>
      </section>

      <section className={styles.sectionGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Handler health</h2>
            <Link className={styles.textLink} href="/dashboard/handlers">
              View all handlers
            </Link>
          </div>
          <div className={styles.cardGrid}>
            {handlerCards.length === 0 ? (
              <p className={styles.emptyState}>
                No handler telemetry recorded yet.
              </p>
            ) : (
              handlerCards.map((card) => (
                <div key={card.handler} className={styles.handlerCard}>
                  <div className={styles.handlerHeader}>
                    <h3>{card.handler}</h3>
                    <span className={styles.pill}>
                      {card.successRate}% success
                    </span>
                  </div>
                  <div className={styles.handlerStats}>
                    <div>
                      <p className={styles.statLabel}>Total calls</p>
                      <p className={styles.statValue}>{card.total}</p>
                    </div>
                    <div>
                      <p className={styles.statLabel}>Avg latency</p>
                      <p className={styles.statValue}>
                        {card.avgLatencyMs > 0
                          ? `${card.avgLatencyMs}ms`
                          : "--"}
                      </p>
                    </div>
                    <div>
                      <p className={styles.statLabel}>Last success</p>
                      <p className={styles.statValue}>
                        {formatTime({ timestamp: card.lastSuccessAt })}
                      </p>
                    </div>
                  </div>
                  <div className={styles.handlerFoot}>
                    <p className={styles.statLabel}>Last error</p>
                    <p className={styles.statValue}>
                      {card.lastErrorAt
                        ? formatTime({ timestamp: card.lastErrorAt })
                        : "None"}
                    </p>
                    {card.lastErrorMessage && (
                      <p className={styles.errorText}>
                        {card.lastErrorMessage}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Recent failures</h2>
            <Link className={styles.textLink} href="/dashboard/events">
              Inspect event stream
            </Link>
          </div>
          {recentFailures.length === 0 ? (
            <p className={styles.emptyState}>
              No failed pipelines in this window.
            </p>
          ) : (
            <ul className={styles.failureList}>
              {recentFailures.map((entry) => (
                <li
                  key={entry.session.session_id}
                  className={styles.failureItem}
                >
                  <div>
                    <p className={styles.failureSession}>
                      {entry.session.session_id}
                    </p>
                    <p className={styles.failureDetail}>
                      Step: {entry.failure?.step}
                    </p>
                  </div>
                  <div>
                    <p className={styles.failureTime}>
                      {formatDateTime({ timestamp: entry.failure?.timestamp })}
                    </p>
                    <Link
                      className={styles.textLink}
                      href={`/dashboard/pipeline/${entry.session.session_id}`}
                    >
                      View pipeline
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
