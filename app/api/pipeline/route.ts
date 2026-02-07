import {
  PipelineTracker,
  getPipelineDefinition,
  type PipelineType,
} from "@repo/pipeline";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pipeline/status?session_id=chk_123&pipeline_type=checkout_digital
 * 
 * Returns complete pipeline status for useSWR polling.
 * Includes events, current checksum, and registry history.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get("session_id");
    const pipelineType = searchParams.get("pipeline_type") as PipelineType | null;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required parameter: session_id" },
        { status: 400 }
      );
    }

    if (!pipelineType) {
      return NextResponse.json(
        { error: "Missing required parameter: pipeline_type" },
        { status: 400 }
      );
    }

    const definition = getPipelineDefinition({ type: pipelineType });
    if (!definition) {
      return NextResponse.json(
        { error: `Unknown pipeline type: ${pipelineType}` },
        { status: 400 }
      );
    }

    // TODO: In production, inject persistent storage
    const tracker = new PipelineTracker();

    const summary = await tracker.getStatusSummary({
      session_id: sessionId,
      definition,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Pipeline status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pipeline/track
 * 
 * Track a new pipeline event and optionally auto-snapshot.
 * Body: { event: PipelineEvent, auto_snapshot?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.event) {
      return NextResponse.json(
        { error: "Missing required field: event" },
        { status: 400 }
      );
    }

    const pipelineType = body.event.pipeline_type;
    const definition = getPipelineDefinition({ type: pipelineType });
    
    // TODO: In production, inject persistent storage
    const tracker = new PipelineTracker({
      autoSnapshot: body.auto_snapshot ?? true,
    });

    const result = await tracker.trackEvent({
      event: body.event,
      definition: definition ?? undefined,
    });

    return NextResponse.json({
      success: true,
      event: result.event,
      snapshot: result.snapshot,
    });
  } catch (error) {
    console.error("Pipeline track error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
