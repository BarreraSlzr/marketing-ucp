"use client";

// LEGEND: WorkflowTimeline — horizontal progress bar for workflow steps
// Shows step names, audience badges, and live status for each step
// All usage must comply with this LEGEND and the LICENSE

import type { WorkflowStep } from "@repo/workflows";
import styles from "./workflow-timeline.module.css";

export type StepStatus = "pending" | "active" | "completed" | "failed";

export interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  /** Current active step index (0-based) */
  activeIndex: number;
  /** Status override per step index */
  stepStatuses: StepStatus[];
  /** Navigate to a step (only completed or active allowed) */
  onStepClick?: (params: { index: number }) => void;
}

export function WorkflowTimeline(props: WorkflowTimelineProps) {
  const { steps, activeIndex, stepStatuses, onStepClick } = props;

  return (
    <div
      className={styles.timeline}
      role="navigation"
      aria-label="Workflow progress"
    >
      {steps.map((step, index) => {
        const status = stepStatuses[index] ?? "pending";
        const isClickable = status === "completed" || index === activeIndex;

        return (
          <div
            key={step.id}
            className={`${styles.step} ${
              status === "active" ? styles.stepActive : ""
            } ${status === "completed" ? styles.stepCompleted : ""} ${
              status === "failed" ? styles.stepFailed : ""
            }`}
            onClick={() => isClickable && onStepClick?.({ index })}
            role="button"
            tabIndex={isClickable ? 0 : -1}
            aria-current={index === activeIndex ? "step" : undefined}
            aria-label={`${step.label} — ${status}`}
          >
            <span className={styles.stepIcon}>
              {status === "completed"
                ? "✓"
                : status === "failed"
                  ? "✗"
                  : index + 1}
            </span>
            <span className={styles.stepLabel}>{step.label}</span>
            <span
              className={`${styles.audienceBadge} ${
                step.audience === "customer"
                  ? styles.audienceCustomer
                  : styles.audienceInternal
              }`}
            >
              {step.audience === "customer" ? "🧑 customer" : "⚙️ internal"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
