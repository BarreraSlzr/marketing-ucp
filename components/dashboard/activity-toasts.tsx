"use client";

import {
  demoSeedStorageKey,
  fetchDashboardSessions,
  sessionsEndpoint,
  type DashboardPipelineEvent,
  type DashboardSessionsResponse,
} from "@/lib/dashboard-sessions";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import useSWR from "swr";

const defaultPollIntervalMs = 10_000;

function isPipelineCompleted(params: {
  events: DashboardPipelineEvent[];
}): boolean {
  return params.events.some(
    (event) =>
      event.step === "checkout_completed" && event.status === "success",
  );
}

function getLatestEvent(params: {
  events: DashboardPipelineEvent[];
}): DashboardPipelineEvent | null {
  if (params.events.length === 0) {
    return null;
  }
  return [...params.events].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  )[0];
}

function isDemoEvent(params: {
  event: DashboardPipelineEvent | null;
}): boolean {
  if (!params.event?.metadata || typeof params.event.metadata !== "object") {
    return false;
  }
  return (params.event.metadata as Record<string, unknown>).demo === true;
}

export function DashboardActivityToasts(params: { pollIntervalMs?: number }) {
  const pollIntervalMs = params.pollIntervalMs ?? defaultPollIntervalMs;
  const lastSeenRef = useRef<Record<string, number>>({});
  const hasSeededRef = useRef(false);
  const lastSeedRef = useRef(0);
  const { data } = useSWR<DashboardSessionsResponse>(
    sessionsEndpoint,
    fetchDashboardSessions,
    {
      refreshInterval: pollIntervalMs,
      revalidateOnFocus: true,
    },
  );

  useEffect(() => {
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    if (sessions.length === 0) {
      return;
    }

    const seedValue = readDemoSeedTimestamp();
    if (seedValue !== null && seedValue > lastSeedRef.current) {
      lastSeedRef.current = seedValue;
      const seededLastSeen: Record<string, number> = {};
      for (const session of sessions) {
        const lastUpdatedMs = Date.parse(session.last_updated);
        if (!Number.isFinite(lastUpdatedMs)) {
          continue;
        }
        const latestEvent = getLatestEvent({ events: session.events });
        seededLastSeen[session.session_id] = isDemoEvent({ event: latestEvent })
          ? 0
          : lastUpdatedMs;
      }
      lastSeenRef.current = seededLastSeen;
      hasSeededRef.current = true;
    }

    const nextLastSeen: Record<string, number> = {
      ...lastSeenRef.current,
    };

    const updates: Array<{ sessionId: string; step: string | null }> = [];

    for (const session of sessions) {
      const lastUpdatedMs = Date.parse(session.last_updated);
      if (!Number.isFinite(lastUpdatedMs)) {
        continue;
      }

      const latestEvent = getLatestEvent({ events: session.events });
      const latestStep = latestEvent?.step ?? null;

      if (!hasSeededRef.current) {
        nextLastSeen[session.session_id] = lastUpdatedMs;
        continue;
      }

      const prev = nextLastSeen[session.session_id] ?? 0;
      const allowToast =
        isDemoEvent({ event: latestEvent }) ||
        !isPipelineCompleted({ events: session.events });

      if (lastUpdatedMs > prev && allowToast) {
        updates.push({
          sessionId: session.session_id,
          step: latestStep,
        });
      }
      nextLastSeen[session.session_id] = Math.max(prev, lastUpdatedMs);
    }

    if (!hasSeededRef.current) {
      hasSeededRef.current = true;
    }

    if (updates.length > 0) {
      updates.forEach((update) => {
        toast(`Pipeline update: ${update.sessionId}`, {
          description: update.step
            ? `Currently at ${update.step}`
            : "New activity",
        });
      });
    }

    lastSeenRef.current = nextLastSeen;
  }, [data?.sessions]);

  return null;
}

function readDemoSeedTimestamp(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(demoSeedStorageKey);
    if (!value) {
      return null;
    }
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}
