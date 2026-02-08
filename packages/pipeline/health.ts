// LEGEND: Pipeline handler health computation — aggregates events into health metrics
// Produces status, success rates, and latency percentiles for handler monitoring
// All usage must comply with this LEGEND and the LICENSE

import { getIsoTimestamp } from "../../utils/stamp";
import type { PipelineEvent } from "./event";

export type HandlerHealthStatus = "healthy" | "degraded" | "down";

export interface HandlerHealth {
  handler: string;
  total_calls: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_success: string | null;
  last_failure: string | null;
  last_error: { code: string; message: string } | null;
  status: HandlerHealthStatus;
}

function formatRate(params: { success: number; total: number }): number {
  if (params.total === 0) {
    return 0;
  }
  return Math.round((params.success / params.total) * 100);
}

function computePercentile(params: {
  values: number[];
  percentile: number;
}): number {
  if (params.values.length === 0) {
    return 0;
  }
  const sorted = [...params.values].sort((a, b) => a - b);
  const index = Math.ceil(params.percentile * sorted.length) - 1;
  const clampedIndex = Math.min(Math.max(index, 0), sorted.length - 1);
  return sorted[clampedIndex];
}

function getLastTimestamp(params: { events: PipelineEvent[] }): string | null {
  if (params.events.length === 0) {
    return null;
  }
  return params.events
    .map((event) => event.timestamp)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function getLastError(params: { events: PipelineEvent[] }): HandlerHealth["last_error"] {
  if (params.events.length === 0) {
    return null;
  }
  const latest = params.events
    .filter((event) => event.status === "failure")
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

  if (!latest) {
    return null;
  }

  const metadata = latest.metadata as Record<string, unknown> | undefined;
  const codeValue =
    (metadata?.error_code as string | undefined) ??
    (metadata?.code as string | undefined) ??
    "unknown";
  const messageValue =
    latest.error ??
    (metadata?.error_message as string | undefined) ??
    "Unknown error";

  return { code: codeValue, message: messageValue };
}

function computeStatus(params: {
  totalCalls: number;
  successRate: number;
  events: PipelineEvent[];
  nowIso?: string;
}): HandlerHealthStatus {
  if (params.totalCalls === 0) {
    return "down";
  }

  const nowMs = Date.parse(params.nowIso ?? getIsoTimestamp());
  const oneHourMs = 60 * 60 * 1_000;
  const recentCalls = params.events.filter(
    (event) => nowMs - Date.parse(event.timestamp) <= oneHourMs
  );

  if (recentCalls.length === 0) {
    return "down";
  }

  if (params.successRate > 95) {
    return "healthy";
  }

  if (params.successRate >= 50) {
    return "degraded";
  }

  return "down";
}

export function computeHandlerHealth(params: {
  handler: string;
  events: PipelineEvent[];
  nowIso?: string;
}): HandlerHealth {
  const totalCalls = params.events.length;
  const successEvents = params.events.filter((event) => event.status === "success");
  const failureEvents = params.events.filter((event) => event.status === "failure");
  const latencies = params.events
    .map((event) => event.duration_ms)
    .filter((duration): duration is number => typeof duration === "number");

  const successRate = formatRate({
    success: successEvents.length,
    total: totalCalls,
  });
  const avgLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
      : 0;
  const p95LatencyMs = computePercentile({ values: latencies, percentile: 0.95 });

  return {
    handler: params.handler,
    total_calls: totalCalls,
    success_count: successEvents.length,
    failure_count: failureEvents.length,
    success_rate: successRate,
    avg_latency_ms: avgLatencyMs,
    p95_latency_ms: p95LatencyMs,
    last_success: getLastTimestamp({ events: successEvents }),
    last_failure: getLastTimestamp({ events: failureEvents }),
    last_error: getLastError({ events: params.events }),
    status: computeStatus({
      totalCalls,
      successRate,
      events: params.events,
      nowIso: params.nowIso,
    }),
  };
}