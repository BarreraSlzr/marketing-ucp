"use client";

import { Link } from "@/i18n/navigation";
import type { PipelineEvent } from "@repo/pipeline";
import styles from "./event-card.module.css";

export type WorkflowEvent = PipelineEvent & {
  chain_hash?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(params: { timestamp: string }): string {
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return "--";
  }
  return dateFormatter.format(ms);
}

function formatDuration(params: { duration?: number }): string {
  if (typeof params.duration !== "number") {
    return "--";
  }
  return `${params.duration}ms`;
}

function formatHashSnippet(params: { hash?: string | null }): string {
  if (!params.hash) {
    return "--";
  }
  return `${params.hash.slice(0, 10)}...`;
}

export function EventCard(params: { event: WorkflowEvent }) {
  const { event } = params;
  const statusClass = styles[event.status] ?? "";

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <div>
          <div className={styles.stepRow}>
            <span className={styles.step}>{event.step}</span>
            <span className={`${styles.status} ${statusClass}`}>
              {event.status}
            </span>
          </div>
          <div className={styles.metaRow}>
            <span>{formatTimestamp({ timestamp: event.timestamp })}</span>
            <span>{formatDuration({ duration: event.duration_ms })}</span>
          </div>
        </div>
        <div className={styles.pipelineMeta}>
          <span className={styles.metaLabel}>Pipeline</span>
          <span className={styles.metaValue}>{event.pipeline_type}</span>
        </div>
      </header>

      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <span className={styles.metaLabel}>Session</span>
          <Link
            href={`/dashboard/pipeline/${event.session_id}`}
            className={styles.sessionLink}
          >
            {event.session_id}
          </Link>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.metaLabel}>Handler</span>
          <span className={styles.metaValue}>
            {event.handler ?? "unattributed"}
          </span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.metaLabel}>Chain hash</span>
          <span
            className={styles.metaValue}
            title={event.chain_hash ?? undefined}
          >
            {formatHashSnippet({ hash: event.chain_hash })}
          </span>
        </div>
      </div>
    </article>
  );
}
