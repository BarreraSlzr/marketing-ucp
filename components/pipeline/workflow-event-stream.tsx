"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import useSWR from "swr";
import { EventCard, type WorkflowEvent } from "./event-card";
import styles from "./workflow-event-stream.module.css";

interface WorkflowEventStreamResponse {
  events: WorkflowEvent[];
  total: number;
}

interface WorkflowEventStreamProps {
  workflowId: string;
  sessionId?: string;
  pipelineId?: string;
  limit?: number;
  since?: string;
}

const fetcher = async (url: string): Promise<WorkflowEventStreamResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load events");
  }
  return (await response.json()) as WorkflowEventStreamResponse;
};

export function WorkflowEventStream(props: WorkflowEventStreamProps) {
  const searchParams = useSearchParams();
  const querySessionId =
    searchParams.get("session_id") ?? searchParams.get("sessionId") ?? "";
  const queryPipelineId =
    searchParams.get("pipeline_id") ?? searchParams.get("pipelineId") ?? "";

  const sessionId = props.sessionId ?? querySessionId;
  const pipelineId = props.pipelineId ?? queryPipelineId;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (props.workflowId) params.set("workflowId", props.workflowId);
    if (sessionId) params.set("sessionId", sessionId);
    if (pipelineId) params.set("pipelineId", pipelineId);
    if (typeof props.limit === "number") params.set("limit", `${props.limit}`);
    if (props.since) params.set("since", props.since);
    const query = params.toString();
    return query ? `/api/pipeline/events?${query}` : "/api/pipeline/events";
  }, [pipelineId, props.limit, props.since, props.workflowId, sessionId]);

  const { data, error, isLoading } = useSWR<WorkflowEventStreamResponse>(
    queryString,
    fetcher,
    {
      refreshInterval: 1000,
      revalidateOnFocus: true,
    },
  );

  const events = useMemo(() => {
    const list = Array.isArray(data?.events) ? data.events : [];
    return [...list].sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    );
  }, [data?.events]);

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <p className={styles.kicker}>Live feed</p>
          <h3 className={styles.title}>Workflow event stream</h3>
          <p className={styles.subtitle}>
            Updates every second as new pipeline events arrive.
          </p>
        </div>
        <div className={styles.contextPills}>
          {props.workflowId && (
            <span className={styles.pill}>Workflow: {props.workflowId}</span>
          )}
          {sessionId && (
            <span className={styles.pill}>Session: {sessionId}</span>
          )}
          {pipelineId && (
            <span className={styles.pill}>Pipeline: {pipelineId}</span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className={styles.stateCard}>Loading live events...</div>
      )}
      {error && (
        <div className={styles.stateCard}>
          Unable to load events. Try refreshing.
        </div>
      )}
      {!isLoading && !error && events.length === 0 && (
        <div className={styles.stateCard}>
          No events yet. Start a session to see activity.
        </div>
      )}

      {events.length > 0 && (
        <div className={styles.list}>
          {events.map((event) => (
            <EventCard
              key={`${event.session_id}-${event.id}-${event.timestamp}`}
              event={event}
            />
          ))}
        </div>
      )}
    </section>
  );
}
