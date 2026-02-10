"use client";

import { Link } from "@/i18n/navigation";
import type { WorkflowDefinition } from "@repo/workflows";
import { Play, RefreshCw, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import { useState } from "react";
import useSWR from "swr";
import { fetchPipelineEvents, type PipelineEvent } from "./[id]/data";
import styles from "./workflow-stream.module.css";

// LEGEND: WorkflowStream component
// Unified workflow monitoring with registry templates and live event stream
// All usage must comply with this LEGEND and the LICENSE

interface WorkflowStreamProps {
  workflows: WorkflowDefinition[];
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

export function WorkflowStream(props: WorkflowStreamProps) {
  const { workflows } = props;
  const router = useRouter();
  const [filters, setFilters] = useQueryStates({
    workflowId: parseAsString,
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
      workflowId: filters.workflowId || undefined,
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

  const handlePlayDemo = (workflowId: string) => {
    router.push(`/dashboard/workflows/${workflowId}`);
  };

  const hasActiveFilters =
    filters.workflowId ||
    filters.sessionId ||
    filters.pipelineId ||
    filters.status;

  return (
    <div className={styles.stream}>
      {/* Registry Templates Section */}
      <section className={styles.registrySection}>
        <div className={styles.registryHeader}>
          <div>
            <h2 className={styles.registryTitle}>
              <Wand2 className={styles.icon} />
              Workflow Registry
            </h2>
            <p className={styles.registrySubtitle}>
              Launch demo workflows with pre-filled templates
            </p>
          </div>
        </div>

        <div className={styles.workflowGrid}>
          {workflows.map((workflow) => (
            <div key={workflow.id} className={styles.workflowCard}>
              <div className={styles.workflowCardHeader}>
                <h3 className={styles.workflowName}>{workflow.name}</h3>
                <span className={styles.workflowCategory}>
                  {workflow.category}
                </span>
              </div>
              <p className={styles.workflowDescription}>
                {workflow.description}
              </p>
              <div className={styles.workflowMeta}>
                <span className={styles.metaPill}>{workflow.id}</span>
                <span className={styles.metaPill}>
                  {workflow.steps.length} steps
                </span>
                {workflow.pipeline_type && (
                  <span className={styles.metaPill}>
                    {workflow.pipeline_type}
                  </span>
                )}
              </div>
              <div className={styles.workflowActions}>
                <button
                  onClick={() => handlePlayDemo(workflow.id)}
                  className={styles.playButton}
                >
                  <Play className={styles.buttonIcon} />
                  Run Demo
                </button>
                <Link
                  href={`/dashboard/workflows/${workflow.id}`}
                  className={styles.viewButton}
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters Section */}
      <section className={styles.filtersSection}>
        <div className={styles.filtersHeader}>
          <h2 className={styles.filtersTitle}>Event Stream Filters</h2>
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
            <label htmlFor="workflowId" className={styles.filterLabel}>
              Workflow
            </label>
            <select
              id="workflowId"
              value={filters.workflowId || ""}
              onChange={(e) =>
                setFilters({ workflowId: e.target.value || null })
              }
              className={styles.filterSelect}
            >
              <option value="">All workflows</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

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
                  workflowId: null,
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

      {/* Live Event Stream */}
      <section className={styles.eventsSection}>
        <div className={styles.eventsHeader}>
          <h2 className={styles.eventsTitle}>Live Event Stream</h2>
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
                Try adjusting your filters or run a demo workflow
              </p>
            )}
          </div>
        )}

        {filteredEvents && filteredEvents.length > 0 && (
          <div className={styles.eventList}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
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
