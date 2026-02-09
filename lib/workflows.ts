import type { WorkflowDefinition } from "@repo/workflows";

export const workflowsEndpoint = "/api/workflows";

export type WorkflowsResponse = {
  workflows: WorkflowDefinition[];
};

export const fetchWorkflows = async (
  url: string,
): Promise<WorkflowsResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load workflows");
  }
  return (await response.json()) as WorkflowsResponse;
};
