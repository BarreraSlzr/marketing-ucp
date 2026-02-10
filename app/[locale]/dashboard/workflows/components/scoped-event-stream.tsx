"use client";

import { RefreshCw } from "lucide-react";
import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import useSWR from "swr";
import { fetchPipelineEvents, type PipelineEvent } from "../[id]/data";
import styles from "./scoped-event-stream.module.css";

// LEGEND: ScopedEventStream component
// Reusable event stream with optional workflow scoping
// Used in both main workflows page and detail pages
// All usage must comply with this LEGEND and the LICENSE

interface ScopedEventStreamProps {
  workflowId?: string;
  showWorkflowBadge?: boolean;
}

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

export function ScopedEventStream(props: ScopedEventStreamProps) {
  const { workflowId, showWorkflowBadge = false } = props;

  const [filters, setFilters] = useQueryStates({
    sessionId: parseAsString,
    pipelineId: parseAsString,
    status: parseAsString,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time event polling with SWR
  const {
    data: events,
    error,
    isLoading,
    mutate,
  } = useSWR(
    {
      workflowId: workflowId || undefined,
      sessionId: filters.sessionId || undefined,
      pipelineId: filters.pipelineId || undefined,
      limit: 50,
    },
    fetchPipelineEvents,
    {
      refreshInterval: 1000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  // Apply client-side status filter
  const filteredEvents = events?.filter((event) => {
    if (!filters.status) return true;
    return event.status === filters.status;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await mutate();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const hasActiveFilters =
    filters.sessionId || filters.pipelineId || filters.status;

  return (
    <div className={styles.container}>
      {/* Filters Section */}
      <section className={styles.filtersSection}>
        <div className={styles.filtersHeader}>
          <h2 className={styles.filtersTitle}>Filters</h2>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={styles.refreshButton}
          >
            <RefreshCw
              className={`${styles.buttonIcon} ${isRefreshing ? styles.spinning : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="sessionId" className={styles.filterLabel}>
              Session ID
            </label>
            <input
              id="sessionId"
              type="text"
              placeholder="Filter by session..."
              value={filters.sessionId || ""}
              onChange={(e) =>
                setFilters({ sessionId: e.target.value || null })
              }
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="pipelineId" className={styles.filterLabel}>
              Pipeline ID
            </label>
            <input
              id="pipelineId"
              type="text"
              placeholder="Filter by pipeline..."
              value={filters.pipelineId || ""}
              onChange={(e) =>
                setFilters({ pipelineId: e.target.value || null })
              }
              className={styles.filterInput}
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="status" className={styles.filterLabel}>
              Status
            </label>
            <select
              id="status"
              value={filters.status || ""}
              onChange={(e) => setFilters({ status: e.target.value || null })}
              className={styles.filterSelect}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                setFilters({
                  sessionId: null,
                  pipelineId: null,
                  status: null,
                })
              }
              className={styles.clearButton}
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Event Stream */}
      <section className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <h2 className={styles.eventsTitle}>Event Stream</h2>
          {filteredEvents && (
            <span className={styles.eventCount}>
              {filteredEvents.length} event
              {filteredEvents.length !== 1 ? "s" : ""}
            </span>
          )}
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            <span className={styles.liveText}>Live</span>
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            <p>Failed to load events</p>
            <p className={styles.errorDetail}>{error.message}</p>
          </div>
        )}

        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Loading events...</p>
          </div>
        )}

        {!isLoading && !error && (!filteredEvents || filteredEvents.length === 0) && (
          <div className={styles.empty}>
            <p>No events found</p>
            {hasActiveFilters && (
              <p className={styles.emptyHint}>
                Try adjusting your filters or trigger a workflow execution
              </p>
            )}
          </div>
        )}

        {filteredEvents && filteredEvents.length > 0 && (
          <div className={styles.eventList}>
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showWorkflowBadge={showWorkflowBadge}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface EventCardProps {
  event: PipelineEvent;
  showWorkflowBadge?: boolean;
}

function EventCard(props: EventCardProps) {
  const { event, showWorkflowBadge = false } = props;

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
          {showWorkflowBadge && event.workflowId && (
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
          {formatTimestamp({ timestamp: event.timestamp })}
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
