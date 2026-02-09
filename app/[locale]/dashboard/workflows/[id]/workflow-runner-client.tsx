"use client";

// LEGEND: WorkflowRunnerClient — bootstrap wrapper for the workflow runner
// Generates session/pipeline IDs and pre-populates URL with mock template data
// All usage must comply with this LEGEND and the LICENSE

import { WorkflowRunner } from "@/components/workflow-runner";
import { serializeCheckout } from "@repo/entities";
import type { WorkflowDefinition } from "@repo/workflows";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

interface WorkflowRunnerClientProps {
  workflow: WorkflowDefinition;
  /** Mock template params to pre-fill forms (from CheckoutTemplate.params) */
  templateParams: Record<string, unknown>;
}

export function WorkflowRunnerClient(props: WorkflowRunnerClientProps) {
  const { workflow, templateParams } = props;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = React.useState(false);

  // Generate or retrieve session + pipeline IDs
  const sessionId = React.useMemo(() => {
    const existing = searchParams.get("session_id");
    if (existing) return existing;
    return `run_${workflow.id}_${Date.now()}`;
  }, [searchParams, workflow.id]);

  const pipelineId = React.useMemo(() => {
    const existing = searchParams.get("pipeline_id");
    if (existing) return existing;
    return `${workflow.pipeline_type || workflow.id}_${Date.now()}`;
  }, [searchParams, workflow.pipeline_type, workflow.id]);

  // Pre-populate URL with mock template data + session context on mount
  React.useEffect(() => {
    if (initialized) return;

    const basePath = window.location.pathname;
    const templateUrl = serializeCheckout(basePath, {
      ...templateParams,
      checkout_id: sessionId,
    } as Record<string, unknown>);

    // Append session/pipeline IDs
    const url = new URL(templateUrl, window.location.origin);
    url.searchParams.set("session_id", sessionId);
    url.searchParams.set("pipeline_id", pipelineId);

    router.replace(url.pathname + url.search, { scroll: false });
    setInitialized(true);
  }, [initialized, templateParams, sessionId, pipelineId, workflow, router]);

  if (!initialized) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <p
          style={{ fontSize: "0.9rem", color: "var(--color-muted-foreground)" }}
        >
          Initializing workflow session…
        </p>
      </div>
    );
  }

  return (
    <WorkflowRunner
      workflow={workflow}
      sessionId={sessionId}
      pipelineId={pipelineId}
    />
  );
}
