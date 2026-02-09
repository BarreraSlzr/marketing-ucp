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
import { useQueryStates } from "nuqs";
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

  const [submitting, setSubmitting] = React.useState(false);
  const [submitResult, setSubmitResult] = React.useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const selectedTemplate = React.useMemo(() => {
    if (!params.onboarding_template) return undefined;
    return getOnboardingTemplate({ id: params.onboarding_template });
  }, [params.onboarding_template]);

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
    [setParams, submitEndpoint, onSuccess],
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Adapter Onboarding</h1>
        <p className={styles.subtitle}>
          Select a payment adapter or service to configure, then fill in the
          required credentials. All data is validated before submission.
        </p>
      </div>

      <AdapterSelector
        templates={templates}
        selectedId={params.onboarding_template}
        onSelect={handleSelect}
      />

      {selectedTemplate && (
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
