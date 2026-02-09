"use client";

// LEGEND: InternalStepCard — live-syncing card for backend/internal workflow steps
// Uses SWR polling against /api/pipeline/status to show real-time pipeline state
// All usage must comply with this LEGEND and the LICENSE

import type { WorkflowStep } from "@repo/workflows";
import * as React from "react";
import useSWR from "swr";
import styles from "./internal-step-card.module.css";

export interface InternalStepCardProps {
  step: WorkflowStep;
  sessionId: string;
  pipelineType: string;
  /** Whether this step is the active step in the runner */
  isActive: boolean;
  /** Called when the internal step resolves successfully */
  onResolved?: () => void;
  /** Polling interval in ms */
  refreshInterval?: number;
}

interface PipelineStatusResponse {
  current_checksum?: {
    steps_completed: number;
    steps_expected: number;
  };
  events?: Array<{
    step: string;
    status: string;
    handler?: string;
    timestamp?: string;
    duration_ms?: number;
  }>;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) return null;
    return r.json();
  });

export function InternalStepCard(props: InternalStepCardProps) {
  const {
    step,
    sessionId,
    pipelineType,
    isActive,
    onResolved,
    refreshInterval = 3000,
  } = props;

  const [resolving, setResolving] = React.useState(false);
  const [resolved, setResolved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // SWR polling for live pipeline status
  const { data } = useSWR<PipelineStatusResponse | null>(
    isActive && sessionId
      ? `/api/pipeline/status?session_id=${sessionId}&pipeline_type=${pipelineType}`
      : null,
    fetcher,
    { refreshInterval },
  );

  // Check if this step's pipeline steps are all resolved
  const stepStatuses = React.useMemo(() => {
    if (!step.pipeline_steps) return [];
    return step.pipeline_steps.map((ps) => {
      const event = data?.events?.find((e) => e.step === ps);
      return {
        step: ps,
        status: event?.status ?? "pending",
        duration: event?.duration_ms,
        handler: event?.handler,
      };
    });
  }, [step.pipeline_steps, data]);

  const allResolved =
    stepStatuses.length > 0 &&
    stepStatuses.every((s) => s.status === "success");

  // Auto-advance when resolved
  React.useEffect(() => {
    if (allResolved && !resolved) {
      setResolved(true);
      onResolved?.();
    }
  }, [allResolved, resolved, onResolved]);

  // Mock-resolve: simulate backend completing this step
  const handleMockResolve = React.useCallback(async () => {
    if (!step.pipeline_steps?.length) return;
    setResolving(true);
    setError(null);

    try {
      for (const pipelineStep of step.pipeline_steps) {
        await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: {
              session_id: sessionId,
              pipeline_type: pipelineType,
              step: pipelineStep,
              status: "success",
              handler: "mock_runner",
              input: { source: "workflow_runner", step_id: step.id },
            },
            auto_snapshot: true,
          }),
        });
        // Small delay between events for realism
        await new Promise((r) => setTimeout(r, 300));
      }
      setResolved(true);
      // Wait for SWR to pick it up before triggering advance
      setTimeout(() => onResolved?.(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve step");
    } finally {
      setResolving(false);
    }
  }, [step, sessionId, pipelineType, onResolved]);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${styles.badgeInternal}`}>
          ⚙️ internal
        </span>
        <span className={styles.title}>{step.label}</span>
      </div>

      {step.description && (
        <p className={styles.description}>{step.description}</p>
      )}

      <div className={styles.statusGrid}>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Status</span>
          <span className={styles.statusValue}>
            {resolved ? "✅ Resolved" : isActive ? "⏳ Pending" : "⏸ Waiting"}
          </span>
        </div>
        <div className={styles.statusItem}>
          <span className={styles.statusLabel}>Session</span>
          <span className={styles.statusValue}>
            {sessionId.slice(0, 20)}...
          </span>
        </div>
        {data?.current_checksum && (
          <>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Pipeline Progress</span>
              <span className={styles.statusValue}>
                {data.current_checksum.steps_completed}/
                {data.current_checksum.steps_expected}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Pipeline step chips with live status */}
      {stepStatuses.length > 0 && (
        <div className={styles.pipelineSteps}>
          {stepStatuses.map((ps) => (
            <span
              key={ps.step}
              className={`${styles.pipelineChip} ${
                ps.status === "success"
                  ? styles.chipSuccess
                  : ps.status === "failure"
                    ? styles.chipFailure
                    : styles.chipPending
              }`}
            >
              {ps.status === "pending" && isActive && (
                <span className={styles.spinner} />
              )}
              {ps.status === "success" && "✓"}
              {ps.status === "failure" && "✗"}
              {ps.step}
              {ps.duration != null && ` (${ps.duration}ms)`}
            </span>
          ))}
        </div>
      )}

      {/* Mock resolve button for testing */}
      {isActive && !resolved && (
        <button
          className={styles.resolveBtn}
          onClick={handleMockResolve}
          disabled={resolving}
        >
          {resolving ? "Resolving…" : "Mock Resolve"}
        </button>
      )}

      {resolved && (
        <div className={styles.resolvedBanner}>
          Step resolved successfully. Pipeline events emitted.
        </div>
      )}

      {error && <div className={styles.errorBanner}>{error}</div>}
    </div>
  );
}
