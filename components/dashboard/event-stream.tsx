"use client";

import { Link } from "@/i18n/navigation";
import type { PipelineEvent } from "@repo/pipeline";
import { useEffect, useMemo, useState } from "react";
import styles from "./event-stream.module.css";

interface EventStreamProps {
  events: PipelineEvent[];
  steps: string[];
  statuses: string[];
  handlers: string[];
}

type GroupByOption =
  | "none"
  | "session"
  | "pipeline"
  | "handler"
  | "status"
  | "step";

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

export function EventStream({
  events,
  steps,
  statuses,
  handlers,
}: EventStreamProps) {
  const [selectedStep, setSelectedStep] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedHandler, setSelectedHandler] = useState<string>("all");
  const [pipelineId, setPipelineId] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [eventState, setEventState] = useState<PipelineEvent[]>(events);
  const [stepOptions, setStepOptions] = useState<string[]>(steps);
  const [statusOptions, setStatusOptions] = useState<string[]>(statuses);
  const [handlerOptions, setHandlerOptions] = useState<string[]>(handlers);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const demoKey = process.env.NEXT_PUBLIC_DEMO_API_KEY;

  const filteredEvents = useMemo(() => {
    return eventState.filter((event) => {
      if (selectedStep !== "all" && event.step !== selectedStep) {
        return false;
      }
      if (selectedStatus !== "all" && event.status !== selectedStatus) {
        return false;
      }
      if (
        selectedHandler !== "all" &&
        (event.handler ?? "unattributed") !== selectedHandler
      ) {
        return false;
      }
      if (pipelineId && !event.session_id.includes(pipelineId)) {
        return false;
      }
      return true;
    });
  }, [eventState, pipelineId, selectedHandler, selectedStatus, selectedStep]);

  const groupedEvents = useMemo(() => {
    if (groupBy === "none") {
      return [
        {
          key: "all",
          label: "All events",
          events: filteredEvents,
        },
      ];
    }

    const buckets = new Map<string, PipelineEvent[]>();
    filteredEvents.forEach((event) => {
      let key = "unattributed";
      if (groupBy === "session") {
        key = event.session_id;
      } else if (groupBy === "pipeline") {
        key = event.pipeline_type;
      } else if (groupBy === "handler") {
        key = event.handler ?? "unattributed";
      } else if (groupBy === "status") {
        key = event.status;
      } else if (groupBy === "step") {
        key = event.step;
      }

      const existing = buckets.get(key) ?? [];
      existing.push(event);
      buckets.set(key, existing);
    });

    return Array.from(buckets.entries())
      .map(([key, events]) => {
        const latestTimestamp = events.reduce((latest, event) => {
          const current = Date.parse(event.timestamp);
          return current > latest ? current : latest;
        }, 0);

        return {
          key,
          label: key,
          events: events.sort(
            (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
          ),
          latestTimestamp,
        };
      })
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [filteredEvents, groupBy]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let isActive = true;
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch("/api/pipeline/sessions");
        if (!response.ok) {
          throw new Error("Failed to refresh events");
        }
        const data = await response.json();
        const nextEvents: PipelineEvent[] = (data.sessions ?? [])
          .flatMap((session: { events: PipelineEvent[] }) => session.events)
          .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

        if (isActive) {
          setEventState(nextEvents);
          setStepOptions(
            Array.from(new Set(nextEvents.map((event) => event.step))).sort(),
          );
          setStatusOptions(
            Array.from(new Set(nextEvents.map((event) => event.status))).sort(),
          );
          setHandlerOptions(
            Array.from(
              new Set(
                nextEvents.map((event) => event.handler ?? "unattributed"),
              ),
            ).sort(),
          );
        }
      } catch (error) {
        if (isActive) {
          setPlayStatus(
            error instanceof Error ? error.message : "Failed to refresh events",
          );
        }
      }
    }, 2000);

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [isPlaying]);

  const handlePlayToggle = () => {
    setPlayStatus(null);
    setIsPlaying((current) => !current);
  };

  const handleReplayDemo = async () => {
    try {
      setIsSeeding(true);
      setPlayStatus(null);
      const response = await fetch("/api/pipeline/demo", {
        method: "POST",
        headers: demoKey ? { "x-demo-key": demoKey } : undefined,
      });
      if (!response.ok) {
        throw new Error("Failed to generate demo events");
      }
      setPlayStatus("Demo events generated");
    } catch (error) {
      setPlayStatus(error instanceof Error ? error.message : "Demo failed");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="step-filter">
            Step
          </label>
          <select
            id="step-filter"
            value={selectedStep}
            onChange={(event) => setSelectedStep(event.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All steps</option>
            {stepOptions.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="handler-filter">
            Handler
          </label>
          <select
            id="handler-filter"
            value={selectedHandler}
            onChange={(event) => setSelectedHandler(event.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All handlers</option>
            {handlerOptions.map((handler) => (
              <option key={handler} value={handler}>
                {handler}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="pipeline-filter">
            Pipeline ID
          </label>
          <input
            id="pipeline-filter"
            value={pipelineId}
            onChange={(event) => setPipelineId(event.target.value)}
            placeholder="Search session id"
            className={styles.filterInput}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="group-filter">
            Group by
          </label>
          <select
            id="group-filter"
            value={groupBy}
            onChange={(event) =>
              setGroupBy(event.target.value as GroupByOption)
            }
            className={styles.filterSelect}
          >
            <option value="none">No grouping</option>
            <option value="session">Session</option>
            <option value="pipeline">Pipeline type</option>
            <option value="handler">Handler</option>
            <option value="status">Status</option>
            <option value="step">Step</option>
          </select>
        </div>
      </div>

      <div className={styles.floatingControls}>
        <button
          type="button"
          className={styles.playButton}
          onClick={handlePlayToggle}
        >
          {isPlaying ? "Pause stream" : "Play stream"}
        </button>
        <button
          type="button"
          className={styles.replayButton}
          onClick={handleReplayDemo}
          disabled={isSeeding}
        >
          {isSeeding ? "Seeding..." : "Replay demo"}
        </button>
        {playStatus && <span className={styles.playStatus}>{playStatus}</span>}
      </div>

      <div className={styles.listHeader}>
        <span>Time</span>
        <span>Pipeline</span>
        <span>Step</span>
        <span>Status</span>
        <span>Handler</span>
        <span>Duration</span>
      </div>

      {filteredEvents.length === 0 ? (
        <div className={styles.emptyState}>No events match these filters.</div>
      ) : (
        <div className={styles.groupedList}>
          {groupedEvents.map((group) => (
            <section key={group.key} className={styles.groupSection}>
              {groupBy !== "none" && (
                <div className={styles.groupHeader}>
                  <span>{group.label}</span>
                  <span className={styles.groupCount}>
                    {group.events.length} events
                  </span>
                </div>
              )}
              <div className={styles.eventList}>
                {group.events.map((event) => (
                  <details key={event.id} className={styles.eventItem}>
                    <summary className={styles.eventSummary}>
                      <span>
                        {formatTimestamp({ timestamp: event.timestamp })}
                      </span>
                      <Link
                        href={`/dashboard/pipeline/${event.session_id}`}
                        className={styles.pipelineLink}
                      >
                        {event.session_id}
                      </Link>
                      <span className={styles.step}>{event.step}</span>
                      <span
                        className={`${styles.status} ${styles[event.status] ?? ""}`}
                      >
                        {event.status}
                      </span>
                      <span>{event.handler ?? "unattributed"}</span>
                      <span>
                        {typeof event.duration_ms === "number"
                          ? `${event.duration_ms}ms`
                          : "--"}
                      </span>
                    </summary>
                    <div className={styles.eventDetails}>
                      <pre>{JSON.stringify(event, null, 2)}</pre>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
