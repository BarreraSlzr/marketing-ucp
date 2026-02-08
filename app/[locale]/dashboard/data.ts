// LEGEND: Dashboard data helpers for pipeline observability
// Server-only helpers for pulling in-memory pipeline data
// All usage must comply with this LEGEND and the LICENSE

import { getAllSessionIds, getGlobalTracker } from "@/lib/pipeline-tracker";
import { getIsoTimestamp } from "@/utils/stamp";
import type { PipelineChecksum, PipelineEvent } from "@repo/pipeline";
import { getPipelineDefinition } from "@repo/pipeline";

export interface PipelineSessionSummary {
  session_id: string;
  pipeline_type: string;
  events: PipelineEvent[];
  checksum: PipelineChecksum | null;
  last_updated: string;
}

function sortEventsByTimestamp(params: { events: PipelineEvent[] }): PipelineEvent[] {
  return [...params.events].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
}

async function buildSessionSummary(params: {
  sessionId: string;
}): Promise<PipelineSessionSummary | null> {
  const tracker = getGlobalTracker();
  const events = await tracker.getEvents({ session_id: params.sessionId });

  if (events.length === 0) {
    return null;
  }

  const sortedEvents = sortEventsByTimestamp({ events });
  const pipeline_type = sortedEvents[0].pipeline_type;
  const definition = getPipelineDefinition({ type: pipeline_type });

  let checksum: PipelineChecksum | null = null;
  if (definition) {
    try {
      checksum = await tracker.getCurrentChecksum({
        session_id: params.sessionId,
        definition,
      });
    } catch (error) {
      console.warn("Dashboard checksum compute failed", error);
    }
  }

  const last_updated =
    sortedEvents.length > 0
      ? sortedEvents[sortedEvents.length - 1].timestamp
      : getIsoTimestamp();

  return {
    session_id: params.sessionId,
    pipeline_type,
    events: sortedEvents,
    checksum,
    last_updated,
  };
}

export async function getDashboardSessions(): Promise<PipelineSessionSummary[]> {
  const sessionIdList = getAllSessionIds();
  const sessions = await Promise.all(
    sessionIdList.map(async (sessionId) => buildSessionSummary({ sessionId }))
  );

  return sessions
    .filter((session): session is PipelineSessionSummary => session !== null)
    .sort((a, b) => Date.parse(b.last_updated) - Date.parse(a.last_updated));
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
