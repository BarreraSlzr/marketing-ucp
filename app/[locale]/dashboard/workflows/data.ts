// LEGEND: Workflow registry data helpers for dashboard
// All usage must comply with this LEGEND and the LICENSE

import type { WorkflowDefinition } from "@repo/workflows";
import { headers } from "next/headers";
import type { WorkflowsResponse } from "@/lib/workflows";

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function getWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/workflows`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load workflow definitions");
  }

  const data = (await response.json()) as WorkflowsResponse;
  return data.workflows ?? [];
}

export async function getWorkflowById(params: {
  workflowId: string;
}): Promise<WorkflowDefinition | null> {
  const workflows = await getWorkflowDefinitions();
  return workflows.find((workflow) => workflow.id === params.workflowId) ?? null;
}
