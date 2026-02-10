"use client";

import { parseAsString, useQueryStates } from "nuqs";
import useSWR from "swr";
import { fetchPipelineEvents, type PipelineEvent } from "./[id]/data";
import styles from "./workflows-event-stream.module.css";

// LEGEND: WorkflowsEventStream component
// Global real-time event polling with SWR (1s refresh interval)
// Displays events across all workflows with optional filtering
// All usage must comply with this LEGEND and the LICENSE

export function WorkflowsEventStream() {
  const [filters] = useQueryStates({
    workflowId: parseAsString,
    sessionId: parseAsString,
    pipelineId: parseAsString,
    status: parseAsString,
  });

  // Real-time event polling with SWR
  const { data: events, error, isLoading } = useSWR(
    {
      workflowId: filters.workflowId || undefined,
      sessionId: filters.sessionId || undefined,
      pipelineId: filters.pipelineId || undefined,
      limit: 50,
    },
    fetchPipelineEvents,
    {
      refreshInterval: 1000, // Poll every second
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Apply client-side status filter
  const filteredEvents = events?.filter((event) => {
    if (!filters.status) return true;
    return event.status === filters.status;
  });

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load events</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading events...</p>
      </div>
    );
  }

  if (!filteredEvents || filteredEvents.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No events found</p>
        {(filters.workflowId ||
          filters.sessionId ||
          filters.pipelineId ||
          filters.status) && (
          <p className={styles.emptyHint}>
            Try adjusting your filters or check back later
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.stream}>
      <div className={styles.header}>
        <h3 className={styles.title}>Live Event Stream</h3>
        <span className={styles.badge}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </span>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          <span className={styles.liveText}>Live</span>
        </div>
      </div>

      <div className={styles.eventList}>
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

interface EventCardProps {
  event: PipelineEvent;
}

function EventCard(props: EventCardProps) {
  const { event } = props;

  const statusColor = {
    pending: "var(--color-muted-foreground)",
    active: "var(--color-primary)",
    completed: "#10b981",
    failed: "#ef4444",
  }[event.status || "pending"];

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventHeader}>
        <div className={styles.eventHeaderLeft}>
          <span className={styles.eventType}>{event.type}</span>
          {event.workflowId && (
            <span className={styles.eventWorkflow}>{event.workflowId}</span>
          )}
        </div>
        <span
          className={styles.eventStatus}
          style={{ color: statusColor, borderColor: statusColor }}
        >
          {event.status || "pending"}
        </span>
      </div>

      <div className={styles.eventMeta}>
        <span className={styles.eventMetaItem}>
          Session: <code>{event.sessionId}</code>
        </span>
        {event.pipelineId && (
          <span className={styles.eventMetaItem}>
            Pipeline: <code>{event.pipelineId}</code>
          </span>
        )}
        <span className={styles.eventMetaItem}>
          {new Date(event.timestamp).toLocaleString()}
        </span>
      </div>

      {event.data && Object.keys(event.data).length > 0 && (
        <details className={styles.eventData}>
          <summary className={styles.eventDataSummary}>Event data</summary>
          <pre className={styles.eventDataContent}>
            {JSON.stringify(event.data, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
