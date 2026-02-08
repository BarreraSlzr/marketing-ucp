"use client";

import { Link } from "@/i18n/navigation";
import type { PipelineEvent } from "@repo/pipeline";
import { Pause, Play, Plus, RefreshCw, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "./event-stream.module.css";

interface EventStreamProps {
  events: PipelineEvent[];
  steps: string[];
  statuses: string[];
  handlers: string[];
}

type FilterKey = "session" | "step" | "status" | "handler" | "pipeline";

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
  const [groupBy] = useState<GroupByOption>("none");
  const [eventState, setEventState] = useState<PipelineEvent[]>(events);
  const [stepOptions, setStepOptions] = useState<string[]>(steps);
  const [statusOptions, setStatusOptions] = useState<string[]>(statuses);
  const [handlerOptions, setHandlerOptions] = useState<string[]>(handlers);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [playStatus, setPlayStatus] = useState<string | null>(null);
  const [filters, setFilters] = useState<
    Array<{ key: FilterKey; value: string }>
  >([]);
  const [activeKey, setActiveKey] = useState<FilterKey>("status");
  const [activeValue, setActiveValue] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const demoKey = process.env.NEXT_PUBLIC_DEMO_API_KEY;

  const refreshEvents = async () => {
    try {
      const response = await fetch("/api/pipeline/sessions");
      if (!response.ok) {
        throw new Error("Failed to refresh events");
      }
      const data = await response.json();
      const nextEvents: PipelineEvent[] = (data.sessions ?? [])
        .flatMap((session: { events: PipelineEvent[] }) => session.events)
        .sort(
          (a: PipelineEvent, b: PipelineEvent) =>
            Date.parse(b.timestamp) - Date.parse(a.timestamp),
        );

      setEventState(nextEvents);
      setStepOptions(
        Array.from(new Set(nextEvents.map((event) => event.step))).sort(),
      );
      setStatusOptions(
        Array.from(new Set(nextEvents.map((event) => event.status))).sort(),
      );
      setHandlerOptions(
        Array.from(
          new Set(nextEvents.map((event) => event.handler ?? "unattributed")),
        ).sort(),
      );
    } catch (error) {
      setPlayStatus(
        error instanceof Error ? error.message : "Failed to refresh events",
      );
    }
  };

  const filterOptions = useMemo(() => {
    const sessionIds = Array.from(
      new Set(eventState.map((event) => event.session_id)),
    ).sort();
    const pipelineTypes = Array.from(
      new Set(eventState.map((event) => event.pipeline_type)),
    ).sort();

    return {
      session: sessionIds,
      step: stepOptions,
      status: statusOptions,
      handler: handlerOptions,
      pipeline: pipelineTypes,
    } satisfies Record<FilterKey, string[]>;
  }, [eventState, handlerOptions, statusOptions, stepOptions]);

  const filteredEvents = useMemo(() => {
    return eventState.filter((event) => {
      const handler = event.handler ?? "unattributed";
      return filters.every((filter) => {
        if (filter.key === "session") {
          return event.session_id.includes(filter.value);
        }
        if (filter.key === "step") {
          return event.step === filter.value;
        }
        if (filter.key === "status") {
          return event.status === filter.value;
        }
        if (filter.key === "handler") {
          return handler === filter.value;
        }
        if (filter.key === "pipeline") {
          return event.pipeline_type === filter.value;
        }
        return true;
      });
    });
  }, [eventState, filters]);

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
      if (!isActive) {
        return;
      }
      await refreshEvents();
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
      await refreshEvents();
    } catch (error) {
      setPlayStatus(error instanceof Error ? error.message : "Demo failed");
    } finally {
      setIsSeeding(false);
    }
  };

  const filterLabels: Record<FilterKey, string> = {
    session: "Session",
    step: "Step",
    status: "Status",
    handler: "Handler",
    pipeline: "Pipeline",
  };

  const addFilter = (key: FilterKey, value: string) => {
    if (!value.trim()) {
      return;
    }
    setFilters((current) => {
      if (
        current.some((filter) => filter.key === key && filter.value === value)
      ) {
        return current;
      }
      return [...current, { key, value }];
    });
  };

  const removeFilter = (index: number) => {
    setFilters((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleAddFromSelects = () => {
    if (!activeValue) {
      return;
    }
    addFilter(activeKey, activeValue);
    setActiveValue("");
  };

  const handleTokenSubmit = () => {
    const tokens = tokenInput
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    tokens.forEach((token) => {
      const [rawKey, ...rest] = token.split(":");
      if (rest.length === 0) {
        addFilter("session", rawKey);
        return;
      }
      const value = rest.join(":");
      const key = rawKey.toLowerCase();
      const mappedKey: FilterKey | null =
        key === "session" || key === "id"
          ? "session"
          : key === "step"
            ? "step"
            : key === "status"
              ? "status"
              : key === "handler"
                ? "handler"
                : key === "pipeline" || key === "type"
                  ? "pipeline"
                  : null;

      if (mappedKey) {
        addFilter(mappedKey, value);
      }
    });

    setTokenInput("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.floatingControls}>
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-key">
              Filter
            </label>
            <select
              id="filter-key"
              value={activeKey}
              onChange={(event) =>
                setActiveKey(event.target.value as FilterKey)
              }
              className={styles.filterSelect}
            >
              <option value="session">Session</option>
              <option value="status">Status</option>
              <option value="step">Step</option>
              <option value="handler">Handler</option>
              <option value="pipeline">Pipeline</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-value">
              Value
            </label>
            <select
              id="filter-value"
              value={activeValue}
              onChange={(event) => setActiveValue(event.target.value)}
              className={styles.filterSelect}
            >
              <option value="">Select</option>
              {filterOptions[activeKey].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleAddFromSelects}
            disabled={!activeValue}
            aria-label="Add filter"
            title="Add filter"
          >
            <Plus aria-hidden="true" size={16} />
          </button>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel} htmlFor="filter-token">
              Quick
            </label>
            <input
              id="filter-token"
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleTokenSubmit();
                }
              }}
              placeholder="status:failure session:demo"
              className={styles.filterInput}
            />
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleTokenSubmit}
            disabled={!tokenInput.trim()}
            aria-label="Add quick filter"
            title="Add quick filter"
          >
            <Plus aria-hidden="true" size={16} />
          </button>
        </div>
        {filters.length > 0 && (
          <div className={styles.activeFilters}>
            {filters.map((filter, index) => (
              <button
                key={`${filter.key}-${filter.value}-${index}`}
                type="button"
                className={styles.filterPill}
                onClick={() => removeFilter(index)}
                aria-label={`Remove ${filterLabels[filter.key]} ${filter.value}`}
              >
                <span>
                  {filterLabels[filter.key]}: {filter.value}
                </span>
                <span className={styles.filterPillIcon}>×</span>
              </button>
            ))}
          </div>
        )}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={refreshEvents}
            aria-label="Refresh events"
            title="Refresh events"
          >
            <RefreshCw aria-hidden="true" size={16} />
          </button>
          <button
            type="button"
            className={styles.iconButtonPrimary}
            onClick={handlePlayToggle}
            aria-label={isPlaying ? "Pause stream" : "Play stream"}
            title={isPlaying ? "Pause stream" : "Play stream"}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" size={16} />
            ) : (
              <Play aria-hidden="true" size={16} />
            )}
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={handleReplayDemo}
            disabled={isSeeding}
            aria-label="Replay demo"
            title="Replay demo"
          >
            <Wand2 aria-hidden="true" size={16} />
          </button>
          {playStatus && (
            <span className={styles.playStatus}>{playStatus}</span>
          )}
        </div>
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
                {group.events.map((event, index) => (
                  <details
                    key={`${event.session_id}-${event.id}-${event.timestamp}-${index}`}
                    className={styles.eventItem}
                  >
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
