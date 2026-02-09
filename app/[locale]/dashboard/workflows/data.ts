// LEGEND: Workflow registry data helpers for dashboard
// All usage must comply with this LEGEND and the LICENSE

import {
  WORKFLOW_DEFINITIONS,
  type WorkflowDefinition,
} from "@repo/workflows";

export async function getWorkflowDefinitions(): Promise<WorkflowDefinition[]> {
  // Use canonical definitions directly from registry
  return WORKFLOW_DEFINITIONS;
}

export async function getWorkflowById(params: {
  workflowId: string;
}): Promise<WorkflowDefinition | null> {
  const workflows = await getWorkflowDefinitions();
  return workflows.find((workflow) => workflow.id === params.workflowId) ?? null;
}
