"use client";

import type { WorkflowDefinition, WorkflowStep } from "@repo/workflows";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAsString, useQueryStates } from "nuqs";
import styles from "../page.module.css";

interface WorkflowDetailClientProps {
  workflow: WorkflowDefinition;
}

export function WorkflowDetailClient({ workflow }: WorkflowDetailClientProps) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [queryState, setQueryState] = useQueryStates({
    sessionId: parseAsString.withDefault(""),
    selectedForm: parseAsString.withDefault(""),
    pipelineId: parseAsString.withDefault(""),
  });

  const handleFormStepClick = (step: WorkflowStep) => {
    if (step.kind === "form" && step.form_ids?.[0]) {
      setQueryState({
        ...queryState,
        selectedForm: step.form_ids[0],
      });
    }
  };

  const handleSessionStart = () => {
    const newSessionId = `wf_${workflow.id}_${Date.now()}`;
    setQueryState({
      ...queryState,
      sessionId: newSessionId,
      selectedForm: "",
      pipelineId: `${workflow.pipeline_type || workflow.id}_${Date.now()}`,
    });
  };

  const getFormStepLink = (step: WorkflowStep): string => {
    if (!step.form_ids?.[0]) return "#";
    const searchParams = new URLSearchParams();
    if (queryState.sessionId) searchParams.set("sessionId", queryState.sessionId);
    if (queryState.pipelineId) searchParams.set("pipelineId", queryState.pipelineId);
    searchParams.set("formId", step.form_ids[0]);
    searchParams.set("workflowId", workflow.id);
    return `/${locale}/onboarding?${searchParams.toString()}`;
  };

  return (
    <div>
      {/* Session Context Header */}
      <div className={styles.sessionContext}>
        {queryState.sessionId ? (
          <div className={styles.sessionInfo}>
            <span className={styles.sessionLabel}>Active Session</span>
            <code className={styles.sessionCode}>{queryState.sessionId}</code>
            {queryState.pipelineId && (
              <>
                <span className={styles.sessionLabel}>Pipeline</span>
                <code className={styles.sessionCode}>
                  {queryState.pipelineId}
                </code>
              </>
            )}
            <button
              className={styles.newSessionBtn}
              onClick={handleSessionStart}
            >
              New Session
            </button>
          </div>
        ) : (
          <div className={styles.noSession}>
            <p>No active session. Start a new session to fill forms.</p>
            <button
              className={styles.startSessionBtn}
              onClick={handleSessionStart}
            >
              Start Session
            </button>
          </div>
        )}
      </div>

      {/* Steps with Form Links */}
      <section className={styles.stepSection}>
        <h2 className={styles.sectionTitle}>Steps</h2>
        <div className={styles.stepList}>
          {workflow.steps.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.stepCard} ${
                step.kind === "form" && queryState.sessionId
                  ? styles.stepCardInteractive
                  : ""
              } ${
                queryState.selectedForm === step.form_ids?.[0]
                  ? styles.stepCardActive
                  : ""
              }`}
            >
              <div className={styles.stepHeader}>
                <span className={styles.stepIndex}>{index + 1}</span>
                <div className={styles.stepHeaderContent}>
                  {step.kind === "form" && queryState.sessionId ? (
                    <Link
                      href={getFormStepLink(step)}
                      className={styles.stepLink}
                      prefetch={false}
                    >
                      <p className={styles.stepName}>{step.label}</p>
                      <p className={styles.stepMeta}>
                        {step.kind}
                        {step.required ? " · required" : " · optional"}
                      </p>
                    </Link>
                  ) : (
                    <>
                      <p className={styles.stepName}>{step.label}</p>
                      <p className={styles.stepMeta}>
                        {step.kind}
                        {step.required ? " · required" : " · optional"}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {step.description && (
                <p className={styles.stepDescription}>{step.description}</p>
              )}
              <div className={styles.stepChips}>
                {step.form_ids?.map((formId) => (
                  <span
                    key={formId}
                    className={`${styles.chip} ${
                      queryState.selectedForm === formId
                        ? styles.chipActive
                        : ""
                    }`}
                  >
                    <span className={styles.chipIcon}>📋</span>
                    form: {formId}
                  </span>
                ))}
                {step.action_ids?.map((actionId) => (
                  <span key={actionId} className={styles.chip}>
                    <span className={styles.chipIcon}>⚡</span>
                    action: {actionId}
                  </span>
                ))}
                {step.endpoint && (
                  <span className={styles.chip}>
                    <span className={styles.chipIcon}>🔗</span>
                    api: {step.endpoint.method} {step.endpoint.path}
                  </span>
                )}
                {step.pipeline_steps?.map((pipelineStep) => (
                  <span key={pipelineStep} className={styles.chip}>
                    <span className={styles.chipIcon}>📊</span>
                    pipeline: {pipelineStep}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Session Info Helper */}
      <div className={styles.sessionHelper}>
        <h3>How to use:</h3>
        <ol>
          <li>Click "Start Session" to begin a workflow session</li>
          <li>Click on any form step to open that form with session context</li>
          <li>Form data will be saved to the session and pipeline</li>
          <li>Navigate between steps using the form links</li>
        </ol>
      </div>
    </div>
  );
}
