"use client";

// LEGEND: WorkflowRunner — step-by-step runner with inline forms & internal sync cards
// Renders customer-facing forms or internal step sync cards for each workflow step
// Mock template data pre-fills forms via URL state (nuqs)
// All usage must comply with this LEGEND and the LICENSE

import {
  submitAddressAction,
  submitBuyerAction,
  submitPaymentAction,
  type FormState,
} from "@/app/actions";
import {
  AddressForm,
  BILLING_FORM_ID,
  BUYER_FORM_ID,
  BuyerForm,
  PAYMENT_FORM_ID,
  PaymentForm,
  PRODUCT_FORM_ID,
  ProductForm,
  SHIPPING_FORM_ID,
} from "@/components/forms";
import type { WorkflowDefinition, WorkflowStep } from "@repo/workflows";
import * as React from "react";
import { useActionState } from "react";
import { InternalStepCard } from "./internal-step-card";
import styles from "./workflow-runner.module.css";
import { WorkflowTimeline, type StepStatus } from "./workflow-timeline";

export interface WorkflowRunnerProps {
  workflow: WorkflowDefinition;
  sessionId: string;
  pipelineId: string;
}

/** Map form_id to the component(s) to render */
function renderFormForId(params: { formId: string }) {
  switch (params.formId) {
    case "buyer-form":
      return {
        component: <BuyerForm />,
        formElId: BUYER_FORM_ID,
        label: "Buyer details",
      };
    case "billing-form":
      return {
        component: <AddressForm type="billing" />,
        formElId: BILLING_FORM_ID,
        label: "Billing address",
      };
    case "shipping-form":
      return {
        component: <AddressForm type="shipping" />,
        formElId: SHIPPING_FORM_ID,
        label: "Shipping address",
      };
    case "payment-form":
      return {
        component: <PaymentForm />,
        formElId: PAYMENT_FORM_ID,
        label: "Payment details",
      };
    case "product-form":
      return {
        component: <ProductForm />,
        formElId: PRODUCT_FORM_ID,
        label: "Product selection",
      };
    default:
      return null;
  }
}

/** Get the server action for a given action_id */
function getActionForId(params: { actionId: string }) {
  switch (params.actionId) {
    case "submitBuyerAction":
      return submitBuyerAction;
    case "submitAddressAction":
      return submitAddressAction;
    case "submitPaymentAction":
      return submitPaymentAction;
    default:
      return null;
  }
}

export function WorkflowRunner(props: WorkflowRunnerProps) {
  const { workflow, sessionId, pipelineId } = props;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [stepStatuses, setStepStatuses] = React.useState<StepStatus[]>(() =>
    workflow.steps.map((_, i) => (i === 0 ? "active" : "pending")),
  );

  const currentStep = workflow.steps[activeIndex];

  // Server action state for form submissions
  const firstAction = currentStep?.action_ids?.[0];
  const serverAction = firstAction
    ? getActionForId({ actionId: firstAction })
    : null;
  const [formState, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(serverAction ?? (async () => ({ success: true })), { success: false });

  // Handle step completion when server action succeeds
  React.useEffect(() => {
    if (formState.success && formState.message) {
      markCurrentComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState]);

  const markCurrentComplete = React.useCallback(() => {
    setStepStatuses((prev) => {
      const next = [...prev];
      next[activeIndex] = "completed";
      if (activeIndex + 1 < workflow.steps.length) {
        next[activeIndex + 1] = "active";
      }
      return next;
    });
    if (activeIndex + 1 < workflow.steps.length) {
      setActiveIndex((i) => i + 1);
    }
  }, [activeIndex, workflow.steps.length]);

  const handlePrevious = React.useCallback(() => {
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }
  }, [activeIndex]);

  const handleSkip = React.useCallback(() => {
    markCurrentComplete();
  }, [markCurrentComplete]);

  const handleTimelineClick = React.useCallback(
    (params: { index: number }) => {
      const status = stepStatuses[params.index];
      if (status === "completed" || params.index === activeIndex) {
        setActiveIndex(params.index);
      }
    },
    [stepStatuses, activeIndex],
  );

  const isComplete = stepStatuses.every((s) => s === "completed");

  /* ── Render step content ───────────────────────────────── */
  const renderStepContent = (step: WorkflowStep, index: number) => {
    // Internal step → show sync card
    if (step.audience === "internal") {
      return (
        <InternalStepCard
          step={step}
          sessionId={sessionId}
          pipelineType={workflow.pipeline_type ?? workflow.id}
          isActive={index === activeIndex}
          onResolved={markCurrentComplete}
        />
      );
    }

    // Customer-facing form step
    if (step.kind === "form" && step.form_ids?.length) {
      return (
        <div className={styles.formContainer}>
          {/* Hidden fields for pipeline context */}
          {step.form_ids.map((formId) => {
            const formDef = renderFormForId({ formId });
            if (!formDef) return null;
            return (
              <div key={formId} className={styles.formSection}>
                <h4 className={styles.formTitle}>{formDef.label}</h4>
                {formDef.component}
                {/* Associate hidden context fields with this form */}
                <input
                  type="hidden"
                  name="checkout_id"
                  value={sessionId}
                  form={formDef.formElId}
                />
                <input
                  type="hidden"
                  name="checkout_pipeline_type"
                  value={workflow.pipeline_type ?? ""}
                  form={formDef.formElId}
                />
              </div>
            );
          })}

          {/* The submit form linked to the first form_id */}
          {serverAction && (
            <form action={formAction} id={`runner-form-${step.id}`}>
              {/* Mirror all form fields via the form attribute on inputs */}
            </form>
          )}
        </div>
      );
    }

    // Page step → show info card with link
    if (step.kind === "page") {
      return (
        <div className={styles.pageStepCard}>
          <p className={styles.pageStepTitle}>{step.label}</p>
          <p className={styles.pageStepDescription}>{step.description}</p>
          {step.endpoint && (
            <a className={styles.pageStepLink} href={step.endpoint.path}>
              Open {step.endpoint.method} {step.endpoint.path} →
            </a>
          )}
        </div>
      );
    }

    // Action step rendered as internal (shouldn't happen if audience is set correctly)
    return (
      <div className={styles.pageStepCard}>
        <p className={styles.pageStepTitle}>{step.label}</p>
        <p className={styles.pageStepDescription}>{step.description}</p>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Session bar */}
      <div className={styles.sessionBar}>
        <span className={styles.sessionLabel}>Session</span>
        <code className={styles.sessionCode}>{sessionId}</code>
        <span className={styles.sessionLabel}>Pipeline</span>
        <code className={styles.sessionCode}>{pipelineId}</code>
      </div>

      {/* Timeline */}
      <WorkflowTimeline
        steps={workflow.steps}
        activeIndex={activeIndex}
        stepStatuses={stepStatuses}
        onStepClick={handleTimelineClick}
      />

      {/* Current step content */}
      {isComplete ? (
        <div className={styles.stepArea}>
          <div className={styles.completionCard}>
            <div className={styles.completionIcon}>🎉</div>
            <h2 className={styles.completionTitle}>Workflow Complete</h2>
            <p className={styles.completionText}>
              All {workflow.steps.length} steps have been resolved. Check the
              dashboard for emitted pipeline events.
            </p>
          </div>
        </div>
      ) : currentStep ? (
        <div className={styles.stepArea}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>{activeIndex + 1}</span>
            <div>
              <h3 className={styles.stepTitle}>{currentStep.label}</h3>
              <p className={styles.stepSubtitle}>{currentStep.description}</p>
            </div>
            <span
              className={`${styles.audienceTag} ${
                currentStep.audience === "customer"
                  ? styles.tagCustomer
                  : styles.tagInternal
              }`}
            >
              {currentStep.audience === "customer"
                ? "🧑 customer"
                : "⚙️ internal"}
            </span>
          </div>

          {renderStepContent(currentStep, activeIndex)}

          {/* Status message from form action */}
          {formState.message && (
            <div
              className={`${styles.statusMessage} ${
                formState.success ? styles.statusSuccess : styles.statusError
              }`}
            >
              {formState.message}
            </div>
          )}

          {/* Navigation bar */}
          <div className={styles.actionBar}>
            <button
              className={styles.navBtn}
              onClick={handlePrevious}
              disabled={activeIndex === 0}
            >
              ← Previous
            </button>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {/* Form submit button for customer steps */}
              {currentStep.audience === "customer" &&
                currentStep.kind === "form" &&
                serverAction && (
                  <button
                    className={`${styles.navBtn} ${styles.navBtnPrimary}`}
                    type="submit"
                    form={currentStep.form_ids?.[0] ?? ""}
                    formAction={formAction as unknown as string}
                    disabled={isPending}
                  >
                    {isPending ? "Submitting…" : "Submit & Next →"}
                  </button>
                )}

              {/* Skip button for non-required or page steps */}
              <button className={styles.navBtn} onClick={handleSkip}>
                {currentStep.kind === "page" ? "Continue →" : "Skip"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
