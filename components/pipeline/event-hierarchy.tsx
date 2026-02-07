// LEGEND: Pipeline event hierarchy component
// Displays a hierarchical view of pipeline events organized by session_id
// Supports filtering and detailed event inspection
// All usage must comply with this LEGEND and the LICENSE

"use client";

import { useState } from "react";
import type { PipelineEvent, PipelineChecksum, PipelineStep } from "@repo/pipeline";
import styles from "./event-hierarchy.module.css";

interface PipelineEventHierarchyProps {
  sessionId: string;
  pipelineType: string;
  events: PipelineEvent[];
  checksum: PipelineChecksum | null;
}

interface EventGroup {
  step: PipelineStep;
  events: PipelineEvent[];
}

export function PipelineEventHierarchy({
  sessionId,
  pipelineType,
  events,
  checksum,
}: PipelineEventHierarchyProps) {
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Group events by step
  const groupEventsByStep = (): EventGroup[] => {
    const grouped = new Map<PipelineStep, PipelineEvent[]>();

    events.forEach((event) => {
      const existing = grouped.get(event.step) || [];
      existing.push(event);
      grouped.set(event.step, existing);
    });

    return Array.from(grouped.entries()).map(([step, events]) => ({
      step,
      events: events.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),
    }));
  };

  const toggleEventExpand = (eventId: string) => {
    const newExpanded = new Set(expandedEventIds);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEventIds(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✓";
      case "failure":
        return "✗";
      case "pending":
        return "⋯";
      case "skipped":
        return "−";
      default:
        return "?";
    }
  };

  const getStatusClass = (status: string) => {
    return styles[`status-${status}`] || styles.statusDefault;
  };

  const filteredGroups = groupEventsByStep().map((group) => ({
    ...group,
    events: group.events.filter(
      (e) => filterStatus === "all" || e.status === filterStatus
    ),
  })).filter((group) => group.events.length > 0);

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.sessionInfo}>
          <h2>Session: {sessionId}</h2>
          <div className={styles.pipelineType}>Pipeline: {pipelineType}</div>
        </div>

        {checksum && (
          <div className={`${styles.checksumCard} ${checksum.is_valid ? styles.valid : styles.invalid}`}>
            <div className={styles.checksumHeader}>
              <span className={styles.checksumLabel}>Pipeline Status</span>
              <span className={styles.checksumBadge}>
                {checksum.is_valid ? "✓ Valid" : "✗ Invalid"}
              </span>
            </div>
            <div className={styles.checksumDetails}>
              <div className={styles.checksumStat}>
                <span className={styles.checksumStatLabel}>Steps Completed:</span>
                <span className={styles.checksumStatValue}>
                  {checksum.steps_completed} / {checksum.steps_expected}
                </span>
              </div>
              {checksum.steps_failed > 0 && (
                <div className={styles.checksumStat}>
                  <span className={styles.checksumStatLabel}>Failed:</span>
                  <span className={`${styles.checksumStatValue} ${styles.failure}`}>
                    {checksum.steps_failed}
                  </span>
                </div>
              )}
              <div className={styles.checksumHash}>
                <span className={styles.checksumStatLabel}>Chain Hash:</span>
                <code className={styles.hash}>{checksum.chain_hash.substring(0, 16)}...</code>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <label htmlFor="status-filter" className={styles.filterLabel}>
          Filter by status:
        </label>
        <select
          id="status-filter"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All ({events.length})</option>
          <option value="success">
            Success ({events.filter(e => e.status === "success").length})
          </option>
          <option value="failure">
            Failure ({events.filter(e => e.status === "failure").length})
          </option>
          <option value="pending">
            Pending ({events.filter(e => e.status === "pending").length})
          </option>
          <option value="skipped">
            Skipped ({events.filter(e => e.status === "skipped").length})
          </option>
        </select>
      </div>

      <div className={styles.timeline}>
        <h3>Event Timeline</h3>
        {sortedEvents.length === 0 ? (
          <div className={styles.emptyState}>No events to display</div>
        ) : (
          <div className={styles.eventList}>
            {sortedEvents
              .filter((e) => filterStatus === "all" || e.status === filterStatus)
              .map((event) => {
                const isExpanded = expandedEventIds.has(event.id);
                return (
                  <div key={event.id} className={styles.eventItem}>
                    <div
                      className={`${styles.eventHeader} ${getStatusClass(event.status)}`}
                      onClick={() => toggleEventExpand(event.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          toggleEventExpand(event.id);
                        }
                      }}
                    >
                      <span className={styles.eventIcon}>
                        {isExpanded ? "▼" : "▶"}
                      </span>
                      <span className={styles.eventStatus}>
                        {getStatusIcon(event.status)}
                      </span>
                      <span className={styles.eventStep}>{event.step}</span>
                      {event.sequence > 0 && (
                        <span className={styles.eventSequence}>
                          (retry {event.sequence})
                        </span>
                      )}
                      <span className={styles.eventTimestamp}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      {event.duration_ms !== undefined && (
                        <span className={styles.eventDuration}>
                          {event.duration_ms}ms
                        </span>
                      )}
                    </div>

                    {isExpanded && (
                      <div className={styles.eventDetails}>
                        <dl className={styles.detailsList}>
                          <dt>Event ID:</dt>
                          <dd><code>{event.id}</code></dd>

                          <dt>Status:</dt>
                          <dd className={getStatusClass(event.status)}>
                            {event.status}
                          </dd>

                          <dt>Timestamp:</dt>
                          <dd>{new Date(event.timestamp).toLocaleString()}</dd>

                          {event.handler && (
                            <>
                              <dt>Handler:</dt>
                              <dd>{event.handler}</dd>
                            </>
                          )}

                          {event.duration_ms !== undefined && (
                            <>
                              <dt>Duration:</dt>
                              <dd>{event.duration_ms}ms</dd>
                            </>
                          )}

                          {event.input_checksum && (
                            <>
                              <dt>Input Checksum:</dt>
                              <dd><code className={styles.checksum}>{event.input_checksum}</code></dd>
                            </>
                          )}

                          {event.output_checksum && (
                            <>
                              <dt>Output Checksum:</dt>
                              <dd><code className={styles.checksum}>{event.output_checksum}</code></dd>
                            </>
                          )}

                          {event.error && (
                            <>
                              <dt>Error:</dt>
                              <dd className={styles.error}>{event.error}</dd>
                            </>
                          )}

                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <>
                              <dt>Metadata:</dt>
                              <dd>
                                <pre className={styles.metadata}>
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </dd>
                            </>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className={styles.groupedView}>
        <h3>Events by Step</h3>
        {filteredGroups.length === 0 ? (
          <div className={styles.emptyState}>No events to display</div>
        ) : (
          <div className={styles.stepGroups}>
            {filteredGroups.map((group) => (
              <div key={group.step} className={styles.stepGroup}>
                <div className={styles.stepHeader}>
                  <h4>{group.step}</h4>
                  <span className={styles.stepCount}>
                    {group.events.length} event{group.events.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className={styles.stepEvents}>
                  {group.events.map((event) => (
                    <div
                      key={event.id}
                      className={`${styles.stepEvent} ${getStatusClass(event.status)}`}
                    >
                      <span className={styles.stepEventStatus}>
                        {getStatusIcon(event.status)}
                      </span>
                      <span className={styles.stepEventTime}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      {event.sequence > 0 && (
                        <span className={styles.stepEventRetry}>
                          retry {event.sequence}
                        </span>
                      )}
                      {event.duration_ms !== undefined && (
                        <span className={styles.stepEventDuration}>
                          {event.duration_ms}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
