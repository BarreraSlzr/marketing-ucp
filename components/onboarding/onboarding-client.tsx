"use client";

// LEGEND: Onboarding client – composite page component
// Combines adapter selection, form rendering, and submit handling
// All usage must comply with this LEGEND and the LICENSE

import {
  ALL_ONBOARDING_TEMPLATES,
  getOnboardingTemplate,
  onboardingParsers,
  type OnboardingFormStatus,
} from "@repo/onboarding";
import { parseAsString, useQueryStates } from "nuqs";
import * as React from "react";
import { AdapterSelector } from "./adapter-selector";
import styles from "./onboarding-client.module.css";
import { OnboardingForm } from "./onboarding-form";

export interface OnboardingClientProps {
  /** Override default template list */
  templates?: typeof ALL_ONBOARDING_TEMPLATES;
  /** API endpoint to POST form submission */
  submitEndpoint?: string;
  /** Callback after successful submission */
  onSuccess?: (params: {
    templateId: string;
    status: OnboardingFormStatus;
  }) => void;
}

export function OnboardingClient(props: OnboardingClientProps) {
  const {
    templates = ALL_ONBOARDING_TEMPLATES,
    submitEndpoint = "/api/onboarding",
    onSuccess,
  } = props;

  const [params, setParams] = useQueryStates(onboardingParsers, {
    shallow: false,
  });

  // Workflow context parameters
  const [workflowParams] = useQueryStates({
    sessionId: parseAsString.withDefault(""),
    formId: parseAsString.withDefault(""),
    pipelineId: parseAsString.withDefault(""),
    workflowId: parseAsString.withDefault(""),
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [submitResult, setSubmitResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(false);

  const selectedTemplate = React.useMemo(() => {
    if (!params.onboarding_template) return undefined;
    return getOnboardingTemplate({ id: params.onboarding_template });
  }, [params.onboarding_template]);

  // Check if we're in workflow context
  const isWorkflowContext = Boolean(workflowParams.sessionId);

  // Auto-select template if formId is provided in URL
  React.useEffect(() => {
    if (
      workflowParams.formId &&
      !params.onboarding_template &&
      !submitting
    ) {
      setIsInitializing(true);
      const formToTemplateMap: Record<string, string> = {
        "buyer-form": "stripe",
        "payment-form": "stripe",
        "billing-form": "stripe",
        "shipping-form": "stripe",
      };
      const templateId = formToTemplateMap[workflowParams.formId];
      if (templateId) {
        setParams({
          onboarding_template: templateId,
          onboarding_status: "draft" as const,
          onboarding_values: {},
          onboarding_group: "credentials",
        });
        // Simulate brief syncing delay for UX feedback
        setTimeout(() => setIsInitializing(false), 600);
      }
    }
  }, [workflowParams.formId, params.onboarding_template, submitting, setParams]);

  /* ── Select adapter ──────────────────────────────────────── */
  const handleSelect = React.useCallback(
    (p: { templateId: string }) => {
      setParams({
        onboarding_template: p.templateId,
        onboarding_status: "draft" as const,
        onboarding_values: {},
        onboarding_group: "credentials",
      });
      setSubmitResult(null);
    },
    [setParams],
  );

  /* ── Observable field changes → sync to URL ──────────────── */
  const handleChange = React.useCallback(
    (p: { key: string; value: string; allValues: Record<string, string> }) => {
      setParams({ onboarding_values: p.allValues });
    },
    [setParams],
  );

  /* ── Submit handler → POST to API ────────────────────────── */
  const handleSubmit = React.useCallback(
    async (p: {
      templateId: string;
      values: Record<string, string>;
      status: OnboardingFormStatus;
      updatedAt: string;
    }) => {
      setSubmitting(true);
      setSubmitResult(null);

      try {
        const res = await fetch(submitEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: p.templateId,
            values: p.values,
            status: p.status,
            updatedAt: p.updatedAt,
            // Include workflow context in submission
            workflowContext: workflowParams.sessionId ? {
              sessionId: workflowParams.sessionId,
              formId: workflowParams.formId,
              pipelineId: workflowParams.pipelineId,
              workflowId: workflowParams.workflowId,
            } : undefined,
          }),
        });

        if (res.ok) {
          setParams({ onboarding_status: "submitted" as const });
          setSubmitResult({
            ok: true,
            message: "Onboarding submitted successfully!",
          });
          onSuccess?.({ templateId: p.templateId, status: "submitted" });
        } else {
          const body = await res.json().catch(() => ({}));
          setSubmitResult({
            ok: false,
            message: body.error ?? `Submission failed (${res.status})`,
          });
        }
      } catch (err) {
        setSubmitResult({
          ok: false,
          message: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [setParams, submitEndpoint, onSuccess, workflowParams],
  );

  return (
    <div className={styles.container}>
      {/* Workflow Context Header */}
      {isWorkflowContext && (
        <div className={styles.workflowContextBanner}>
          <div className={styles.contextInfo}>
            <span className={styles.contextLabel}>Workflow Session</span>
            <code className={styles.contextValue}>{workflowParams.sessionId}</code>
            {workflowParams.workflowId && (
              <>
                <span className={styles.contextLabel}>Workflow</span>
                <code className={styles.contextValue}>{workflowParams.workflowId}</code>
              </>
            )}
          </div>
        </div>
      )}

      {/* Show different header based on context */}
      {isWorkflowContext ? (
        <div className={styles.header}>
          <h1 className={styles.title}>Payment Setup</h1>
          <p className={styles.subtitle}>
            Complete your payment handler configuration to proceed.
          </p>
        </div>
      ) : (
        <div className={styles.header}>
          <h1 className={styles.title}>Adapter Onboarding</h1>
          <p className={styles.subtitle}>
            Select a payment adapter or service to configure, then fill in the
            required credentials. All data is validated before submission.
          </p>
        </div>
      )}

      {/* Only show adapter selector if NOT in workflow context */}
      {!isWorkflowContext && (
        <AdapterSelector
          templates={templates}
          selectedId={params.onboarding_template}
          onSelect={handleSelect}
        />
      )}

      {/* Show syncing state while initializing in workflow context */}
      {isWorkflowContext && isInitializing && (
        <div className={styles.syncingCard}>
          <div className={styles.syncingSpinner}></div>
          <div className={styles.syncingContent}>
            <h3 className={styles.syncingTitle}>Syncing Payment Handler</h3>
            <p className={styles.syncingDescription}>
              Configuring {selectedTemplate?.name || "payment processor"} integration...
            </p>
            {workflowParams.formId && (
              <p className={styles.syncingFormType}>
                Form: <code>{workflowParams.formId}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Show form once ready */}
      {selectedTemplate && !isInitializing && (
        <div className={styles.formSection}>
          <OnboardingForm
            template={selectedTemplate}
            initialValues={params.onboarding_values ?? {}}
            onSubmit={handleSubmit}
            onChange={handleChange}
            submitting={submitting}
            readOnly={params.onboarding_status === "submitted"}
          />
        </div>
      )}

      {submitResult && (
        <div
          className={
            submitResult.ok ? styles.successBanner : styles.errorBanner
          }
          role="alert"
        >
          {submitResult.message}
        </div>
      )}
    </div>
  );
}

