"use client";

import { Link } from "@/i18n/navigation";
import {
  fetchDashboardSessions,
  sessionsEndpoint,
  type DashboardPipelineEvent,
  type DashboardSessionsResponse,
  type PipelineChecksum,
  type PipelineSessionSummary,
} from "@/lib/dashboard-sessions";
import {
  fetchWorkflows,
  workflowsEndpoint,
  type WorkflowsResponse,
} from "@/lib/workflows";
import { getIsoTimestamp } from "@/utils/stamp";
import { computeHandlerHealth } from "@repo/pipeline";
import { useMemo } from "react";
import useSWR from "swr";
import { DemoControls } from "./demo-controls";
import styles from "./page.module.css";

type StatusTone = "success" | "warning" | "danger" | "neutral";

type StatusSummary = {
  label: string;
  tone: StatusTone;
};

type ActivityEntry = {
  sessionId: string;
  eventCount: number;
  status: StatusSummary;
  fraudStatus: StatusSummary;
  checksumStatus: StatusSummary;
  lastEvent: DashboardPipelineEvent | null;
  isCompleted?: boolean;
};

const defaultPollIntervalMs = 10_000;
function isPipelineCompleted(params: {
  events: DashboardPipelineEvent[];
}): boolean {
  return params.events.some(
    (event) =>
      event.step === "checkout_completed" && event.status === "success",
  );
}

function getLatestEvent(params: {
  events: DashboardPipelineEvent[];
}): DashboardPipelineEvent | null {
  if (params.events.length === 0) {
    return null;
  }
  return [...params.events].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  )[0];
}

function getPipelineStatus(params: {
  events: DashboardPipelineEvent[];
}): StatusSummary {
  const { events } = params;

  if (
    events.some(
      (event) => event.status === "failure" && event.step === "fraud_check",
    )
  ) {
    return { label: "blocked", tone: "danger" };
  }

  if (
    events.some(
      (event) => event.status === "failure" && event.step === "checkout_failed",
    )
  ) {
    return { label: "failed", tone: "danger" };
  }

  if (
    events.some(
      (event) =>
        event.step === "fraud_review_escalated" && event.status === "pending",
    )
  ) {
    return { label: "suspicious", tone: "warning" };
  }

  const reviewDecision = events.find(
    (event) =>
      event.step === "fraud_check" &&
      typeof event.metadata === "object" &&
      event.metadata !== null &&
      (event.metadata as Record<string, unknown>).decision === "review",
  );

  if (reviewDecision) {
    return { label: "suspicious", tone: "warning" };
  }

  if (
    events.some(
      (event) =>
        event.step === "checkout_completed" && event.status === "success",
    )
  ) {
    return { label: "successful", tone: "success" };
  }

  return { label: "in progress", tone: "neutral" };
}

function getChecksumStatus(params: {
  checksum: PipelineChecksum | null | undefined;
}): StatusSummary {
  if (!params.checksum) {
    return { label: "checksum pending", tone: "neutral" };
  }

  if (params.checksum.is_valid) {
    return { label: "checksum valid", tone: "success" };
  }

  return { label: "checksum invalid", tone: "danger" };
}

function getFraudStatus(params: {
  events: DashboardPipelineEvent[];
}): StatusSummary {
  const { events } = params;

  if (
    events.some(
      (event) => event.status === "failure" && event.step === "fraud_check",
    )
  ) {
    return { label: "fraud blocked", tone: "danger" };
  }

  if (
    events.some(
      (event) =>
        event.step === "fraud_review_escalated" && event.status === "pending",
    )
  ) {
    return { label: "fraud review", tone: "warning" };
  }

  const reviewDecision = events.find(
    (event) =>
      event.step === "fraud_check" &&
      typeof event.metadata === "object" &&
      event.metadata !== null &&
      (event.metadata as Record<string, unknown>).decision === "review",
  );

  if (reviewDecision) {
    return { label: "fraud review", tone: "warning" };
  }

  if (
    events.some(
      (event) => event.step === "fraud_check" && event.status === "success",
    )
  ) {
    return { label: "fraud cleared", tone: "success" };
  }

  return { label: "fraud pending", tone: "neutral" };
}

function isHealthHeartbeatEvent(params: {
  event: DashboardPipelineEvent;
}): boolean {
  const metadata = params.event.metadata;
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  return (metadata as Record<string, unknown>).health_heartbeat === true;
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

function buildActivityEntry(params: {
  sessionId: string;
  events: DashboardPipelineEvent[];
  session: PipelineSessionSummary | undefined;
}): ActivityEntry {
  const { sessionId, events, session } = params;
  const lastEvent = getLatestEvent({ events });

  return {
    sessionId,
    eventCount: events.length,
    status: getPipelineStatus({ events }),
    fraudStatus: getFraudStatus({ events }),
    checksumStatus: getChecksumStatus({ checksum: session?.checksum ?? null }),
    lastEvent,
  };
}

function computeDashboardData(params: { sessions: PipelineSessionSummary[] }) {
  const { sessions } = params;
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
      if (session.events.length === 0) {
        return 0;
      }
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

  const handlerStats = allEvents.reduce<
    Record<string, DashboardPipelineEvent[]>
  >((acc, event) => {
    const handler = event.handler ?? "unattributed";
    acc[handler] = acc[handler] ? [...acc[handler], event] : [event];
    return acc;
  }, {});

  const nowIso = getIsoTimestamp();
  const handlerCards = Object.entries(handlerStats).map(([handler, events]) => {
    const health = computeHandlerHealth({ handler, events, nowIso });

    return {
      handler,
      health,
    };
  });

  const sessionById = sessions.reduce<Record<string, PipelineSessionSummary>>(
    (acc, session) => {
      const existing = acc[session.session_id];
      if (!existing) {
        acc[session.session_id] = session;
        return acc;
      }
      const existingLatest = getLatestEvent({ events: existing.events });
      const candidateLatest = getLatestEvent({ events: session.events });
      const existingMs = existingLatest
        ? Date.parse(existingLatest.timestamp)
        : 0;
      const candidateMs = candidateLatest
        ? Date.parse(candidateLatest.timestamp)
        : 0;
      if (candidateMs > existingMs) {
        acc[session.session_id] = session;
      }
      return acc;
    },
    {},
  );

  const activityEvents = allEvents.filter(
    (event) => !isHealthHeartbeatEvent({ event }),
  );

  const eventsBySession = activityEvents.reduce<
    Record<string, DashboardPipelineEvent[]>
  >((acc, event) => {
    acc[event.session_id] = acc[event.session_id]
      ? [...acc[event.session_id], event]
      : [event];
    return acc;
  }, {});

  const recentActivity = Object.entries(eventsBySession)
    .map(([sessionId, events]) =>
      buildActivityEntry({
        sessionId,
        events,
        session: sessionById[sessionId],
      }),
    )
    .filter((entry) => entry.lastEvent)
    .sort(
      (a, b) =>
        Date.parse(b.lastEvent!.timestamp) - Date.parse(a.lastEvent!.timestamp),
    )
    .slice(0, 4);

  const inProgressActivity = Object.entries(eventsBySession)
    .map(([sessionId, events]) => {
      const entry = buildActivityEntry({
        sessionId,
        events,
        session: sessionById[sessionId],
      });

      return {
        ...entry,
        isCompleted: isPipelineCompleted({ events }),
      };
    })
    .filter((entry) => entry.lastEvent && !entry.isCompleted)
    .sort(
      (a, b) =>
        Date.parse(b.lastEvent!.timestamp) - Date.parse(a.lastEvent!.timestamp),
    )
    .slice(0, 4);

  return {
    activePipelines,
    avgDurationMs,
    allEvents,
    completionRate,
    handlerCards,
    inProgressActivity,
    recentActivity,
  };
}

export function DashboardClient(params: {
  initialSessions: PipelineSessionSummary[];
  pollIntervalMs?: number;
}) {
  const pollIntervalMs = params.pollIntervalMs ?? defaultPollIntervalMs;
  const { data } = useSWR<DashboardSessionsResponse>(
    sessionsEndpoint,
    fetchDashboardSessions,
    {
      fallbackData: { sessions: params.initialSessions },
      refreshInterval: pollIntervalMs,
      revalidateOnFocus: true,
    },
  );
  const { data: workflowsData } = useSWR<WorkflowsResponse>(
    workflowsEndpoint,
    fetchWorkflows,
  );

  const sessions = useMemo(
    () => (Array.isArray(data?.sessions) ? data?.sessions : []),
    [data?.sessions],
  );
  const workflows = useMemo(
    () => (Array.isArray(workflowsData?.workflows) ? workflowsData.workflows : []),
    [workflowsData?.workflows],
  );

  const {
    activePipelines,
    avgDurationMs,
    allEvents,
    completionRate,
    handlerCards,
    inProgressActivity,
    recentActivity,
  } = useMemo(() => computeDashboardData({ sessions }), [sessions]);

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
                    <div className={styles.handlerTitle}>
                      <h3>{card.handler}</h3>
                      <span
                        className={`${styles.statusDot} ${
                          styles[card.health.status]
                        }`}
                      />
                      <span className={styles.statusLabel}>
                        {card.health.status}
                      </span>
                    </div>
                    <span className={styles.pill}>
                      {card.health.success_rate}% success
                    </span>
                  </div>
                  <div className={styles.handlerStats}>
                    <div>
                      <p className={styles.statLabel}>Total calls</p>
                      <p className={styles.statValue}>
                        {card.health.total_calls}
                      </p>
                    </div>
                    <div>
                      <p className={styles.statLabel}>Avg latency</p>
                      <p className={styles.statValue}>
                        {card.health.avg_latency_ms > 0
                          ? `${card.health.avg_latency_ms}ms`
                          : "--"}
                      </p>
                    </div>
                    <div>
                      <p className={styles.statLabel}>Last success</p>
                      <p className={styles.statValue}>
                        {formatTime({ timestamp: card.health.last_success })}
                      </p>
                    </div>
                  </div>
                  <div className={styles.handlerFoot}>
                    <p className={styles.statLabel}>Last error</p>
                    <p className={styles.statValue}>
                      {card.health.last_failure
                        ? formatTime({ timestamp: card.health.last_failure })
                        : "None"}
                    </p>
                    {card.health.last_error && (
                      <p className={styles.errorText}>
                        {card.health.last_error.message}
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
            <h2>Workflow registry</h2>
            <Link className={styles.textLink} href="/dashboard/workflows">
              Explore workflows
            </Link>
          </div>
          {workflows.length === 0 ? (
            <p className={styles.emptyState}>
              No workflow definitions available.
            </p>
          ) : (
            <div className={styles.workflowList}>
              {workflows.map((workflow) => (
                <Link
                  key={workflow.id}
                  className={styles.workflowItem}
                  href={`/dashboard/workflows/${workflow.id}`}
                >
                  <div>
                    <p className={styles.workflowName}>{workflow.name}</p>
                    <p className={styles.workflowDescription}>
                      {workflow.description}
                    </p>
                  </div>
                  <div className={styles.workflowMeta}>
                    <span className={styles.pill}>{workflow.category}</span>
                    {workflow.pipeline_type && (
                      <span className={styles.pill}>
                        {workflow.pipeline_type}
                      </span>
                    )}
                    <span className={styles.pill}>
                      {workflow.steps.length} steps
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Recent activity</h2>
            <Link className={styles.textLink} href="/dashboard/events">
              Inspect event stream
            </Link>
          </div>
          <div className={styles.activityBlock}>
            <h3 className={styles.activityTitle}>In progress</h3>
            {inProgressActivity.length === 0 ? (
              <p className={styles.emptyState}>
                No active pipelines right now.
              </p>
            ) : (
              <ul className={styles.failureList}>
                {inProgressActivity.map((entry) => (
                  <li key={entry.sessionId} className={styles.failureItem}>
                    <div>
                      <p className={styles.failureSession}>{entry.sessionId}</p>
                      <p className={styles.failureDetail}>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.status.tone]
                          }`}
                        >
                          {entry.status.label}
                        </span>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.fraudStatus.tone]
                          }`}
                        >
                          {entry.fraudStatus.label}
                        </span>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.checksumStatus.tone]
                          }`}
                        >
                          {entry.checksumStatus.label}
                        </span>
                      </p>
                      <p className={styles.currentStep}>
                        {entry.lastEvent?.step
                          ? `Currently at: ${entry.lastEvent.step}`
                          : "Currently at: --"}
                        {` · ${entry.eventCount} events`}
                      </p>
                    </div>
                    <div>
                      <p className={styles.failureTime}>
                        {formatDateTime({
                          timestamp: entry.lastEvent?.timestamp,
                        })}
                      </p>
                      <Link
                        className={styles.textLink}
                        href={`/dashboard/pipeline/${entry.sessionId}`}
                      >
                        View pipeline
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.activityBlock}>
            <h3 className={styles.activityTitle}>Recent activity</h3>
            {recentActivity.length === 0 ? (
              <p className={styles.emptyState}>No recent pipeline activity.</p>
            ) : (
              <ul className={styles.failureList}>
                {recentActivity.map((entry) => (
                  <li key={entry.sessionId} className={styles.failureItem}>
                    <div>
                      <p className={styles.failureSession}>{entry.sessionId}</p>
                      <p className={styles.failureDetail}>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.status.tone]
                          }`}
                        >
                          {entry.status.label}
                        </span>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.fraudStatus.tone]
                          }`}
                        >
                          {entry.fraudStatus.label}
                        </span>
                        <span
                          className={`${styles.statusBadge} ${
                            styles[entry.checksumStatus.tone]
                          }`}
                        >
                          {entry.checksumStatus.label}
                        </span>
                      </p>
                      <p className={styles.currentStep}>
                        {entry.lastEvent?.step
                          ? `Currently at: ${entry.lastEvent.step}`
                          : "Currently at: --"}
                        {` · ${entry.eventCount} events`}
                      </p>
                    </div>
                    <div>
                      <p className={styles.failureTime}>
                        {formatDateTime({
                          timestamp: entry.lastEvent?.timestamp,
                        })}
                      </p>
                      <Link
                        className={styles.textLink}
                        href={`/dashboard/pipeline/${entry.sessionId}`}
                      >
                        View pipeline
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
