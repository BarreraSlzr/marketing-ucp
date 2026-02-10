import { z } from "zod";

// LEGEND: Workflow data fetchers
// Use these SWR-compatible fetchers for real-time event streams
// All usage must comply with this LEGEND and the LICENSE

const PipelineEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  sessionId: z.string(),
  pipelineId: z.string().optional(),
  workflowId: z.string().optional(),
  timestamp: z.string(),
  data: z.record(z.unknown()),
  status: z.enum(["pending", "active", "completed", "failed"]).optional(),
});

export type PipelineEvent = z.infer<typeof PipelineEventSchema>;

interface FetchEventsParams {
  workflowId?: string;
  sessionId?: string;
  pipelineId?: string;
  limit?: number;
  offset?: number;
}

/**
 * SWR fetcher for pipeline events
 * Validates response and handles errors gracefully
 */
export async function fetchPipelineEvents(
  params: FetchEventsParams
): Promise<PipelineEvent[]> {
  const searchParams = new URLSearchParams();

  if (params.workflowId) searchParams.set("workflowId", params.workflowId);
  if (params.sessionId) searchParams.set("sessionId", params.sessionId);
  if (params.pipelineId) searchParams.set("pipelineId", params.pipelineId);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());

  const response = await fetch(`/api/pipeline/events?${searchParams}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }

  const data = await response.json();

  // Validate response schema
  const validated = z.array(PipelineEventSchema).parse(data.events);

  return validated;
}

/**
 * SWR fetcher for a specific session's events
 */
export async function fetchSessionEvents(params: {
  sessionId: string;
}): Promise<PipelineEvent[]> {
  return fetchPipelineEvents({ sessionId: params.sessionId });
}

/**
 * SWR fetcher for workflow-specific events
 */
export async function fetchWorkflowEvents(params: {
  workflowId: string;
}): Promise<PipelineEvent[]> {
  return fetchPipelineEvents({ workflowId: params.workflowId });
}
