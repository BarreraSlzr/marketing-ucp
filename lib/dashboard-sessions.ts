import type { PipelineEvent } from "@repo/pipeline";

export type DashboardPipelineEvent = PipelineEvent;

export type PipelineChecksum = {
  is_valid: boolean;
  steps_completed: number;
  steps_expected: number;
  steps_failed: number;
  chain_hash: string;
};

export type PipelineSessionSummary = {
  session_id: string;
  pipeline_type: string;
  events: DashboardPipelineEvent[];
  last_updated: string;
  checksum?: PipelineChecksum | null;
};

export const sessionsEndpoint = "/api/pipeline/sessions";
export const demoSeedStorageKey = "ucp_demo_seed_ts";

export type DashboardSessionsResponse = {
  sessions?: PipelineSessionSummary[];
};

export const fetchDashboardSessions = async (
  url: string,
): Promise<DashboardSessionsResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load sessions");
  }
  return (await response.json()) as DashboardSessionsResponse;
};
