// LEGEND: Dashboard data helpers for pipeline observability
// Server-only helpers for pulling in-memory pipeline data
// All usage must comply with this LEGEND and the LICENSE

import type { PipelineChecksum, PipelineEvent } from "@repo/pipeline";
import { headers } from "next/headers";

export interface PipelineSessionSummary {
  session_id: string;
  pipeline_type: string;
  events: PipelineEvent[];
  checksum: PipelineChecksum | null;
  last_updated: string;
}

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function fetchDashboardSessions(): Promise<PipelineSessionSummary[]> {
  const baseUrl = await getBaseUrl();
  const response = await fetch(`${baseUrl}/api/pipeline/sessions`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load pipeline sessions");
  }

  const data = (await response.json()) as {
    sessions?: PipelineSessionSummary[];
  };

  return data.sessions ?? [];
}

export async function getDashboardSessions(): Promise<PipelineSessionSummary[]> {
  const sessions = await fetchDashboardSessions();

  return [...sessions].sort(
    (a, b) => Date.parse(b.last_updated) - Date.parse(a.last_updated)
  );
}

export async function getDashboardSessionById(params: {
  sessionId: string;
}): Promise<PipelineSessionSummary | null> {
  const sessions = await getDashboardSessions();
  return sessions.find((session) => session.session_id === params.sessionId) ?? null;
}

export async function getDashboardEvents(): Promise<PipelineEvent[]> {
  const sessions = await getDashboardSessions();
  return sessions
    .flatMap((session) => session.events)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
}
