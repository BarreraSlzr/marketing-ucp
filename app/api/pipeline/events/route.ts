import { getAllSessionIds, getGlobalTracker } from "@/lib/pipeline-tracker";
import { getPipelineDefinition, PipelineTypeSchema } from "@repo/pipeline";
import { WORKFLOW_DEFINITIONS } from "@repo/workflows";
import { NextRequest, NextResponse } from "next/server";

const defaultLimit = 200;

function parseSince(params: { value?: string | null }): number | null {
  if (!params.value) {
    return null;
  }

  const dateMs = Date.parse(params.value);
  if (!Number.isNaN(dateMs)) {
    return dateMs;
  }

  const numeric = Number(params.value);
  if (Number.isNaN(numeric) || numeric <= 0) {
    return null;
  }

  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
}

function resolvePipelineTypeFromCandidate(params: {
  value?: string | null;
}): string | null {
  if (!params.value) {
    return null;
  }

  const direct = PipelineTypeSchema.safeParse(params.value);
  if (direct.success) {
    return direct.data;
  }

  const candidates = PipelineTypeSchema.options;
  const matched = candidates.find((candidate) =>
    params.value?.startsWith(`${candidate}_`),
  );

  return matched ?? null;
}

function resolvePipelineFilters(params: {
  pipelineId?: string | null;
  workflowId?: string | null;
}): string[] {
  const filters = new Set<string>();
  const pipelineType = resolvePipelineTypeFromCandidate({ value: params.pipelineId });
  if (pipelineType) {
    filters.add(pipelineType);
  }

  if (params.workflowId) {
    const workflow = WORKFLOW_DEFINITIONS.find(
      (candidate) => candidate.id === params.workflowId,
    );
    if (workflow?.pipeline_type) {
      filters.add(workflow.pipeline_type);
    } else if (workflow?.id) {
      filters.add(workflow.id);
    }
  }

  return Array.from(filters);
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId =
      searchParams.get("sessionId") ?? searchParams.get("session_id");
    const pipelineId =
      searchParams.get("pipelineId") ?? searchParams.get("pipeline_id");
    const workflowId = searchParams.get("workflowId");
    const limitParam = searchParams.get("limit");
    const sinceParam = searchParams.get("since");

    const parsedLimit = limitParam ? Number(limitParam) : defaultLimit;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : defaultLimit;
    const sinceMs = parseSince({ value: sinceParam });
    const pipelineFilters = resolvePipelineFilters({
      pipelineId,
      workflowId,
    });

    const tracker = getGlobalTracker();
    const sessionIds = sessionId ? [sessionId] : await getAllSessionIds();

    const sessions = await Promise.all(
      sessionIds.map(async (id) => {
        const events = await tracker.getEvents({ session_id: id });
        return { session_id: id, events };
      }),
    );

    const chainHashBySession = new Map<string, Map<string, string | null>>();

    await Promise.all(
      sessions.map(async (session) => {
        if (session.events.length === 0) {
          return;
        }

        const pipelineTypes = Array.from(
          new Set(session.events.map((event) => event.pipeline_type)),
        );

        const entries = await Promise.all(
          pipelineTypes.map(async (pipelineType) => {
            const definition = getPipelineDefinition({ type: pipelineType });
            if (!definition) {
              return [pipelineType, null] as const;
            }
            try {
              const checksum = await tracker.getCurrentChecksum({
                session_id: session.session_id,
                definition,
              });
              return [pipelineType, checksum.chain_hash] as const;
            } catch {
              return [pipelineType, null] as const;
            }
          }),
        );

        chainHashBySession.set(session.session_id, new Map(entries));
      }),
    );

    let events = sessions.flatMap((session) =>
      session.events.map((event) => ({
        ...event,
        chain_hash:
          chainHashBySession
            .get(session.session_id)
            ?.get(event.pipeline_type) ?? null,
      })),
    );

    if (pipelineFilters.length > 0) {
      const filterSet = new Set(pipelineFilters);
      events = events.filter((event) => filterSet.has(event.pipeline_type));
    }

    if (sinceMs !== null) {
      events = events.filter((event) => {
        const ms = Date.parse(event.timestamp);
        return !Number.isNaN(ms) && ms >= sinceMs;
      });
    }

    events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

    const total = events.length;
    if (Number.isFinite(limit) && limit > 0) {
      events = events.slice(0, limit);
    }

    return NextResponse.json({ events, total });
  } catch (error) {
    console.error("Pipeline events error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
