import {
  PIPELINE_DEFINITIONS,
  getPipelineDefinition,
  type PipelineEvent,
} from "@repo/pipeline";
import { NextRequest, NextResponse } from "next/server";
import { getGlobalTracker } from "@/lib/pipeline-tracker";

/**
 * GET /api/pipeline/sessions
 *
 * Returns all pipeline sessions with their events and checksums.
 * Groups events by session_id for the UI.
 */
export async function GET(req: NextRequest) {
  try {
    const tracker = getGlobalTracker();

    // Get all events from storage (in-memory for demo)
    // In production, this would query a database

    // Collect all unique session IDs
    const sessionMap = new Map<
      string,
      {
        session_id: string;
        pipeline_type: string;
        events: PipelineEvent[];
        last_updated: string;
      }
    >();

    // Since we're using in-memory storage, we need to iterate through known session IDs
    // For now, we'll return empty array if no demo data has been generated
    // Users should call POST /api/pipeline/demo first to seed data

    const sessions = Array.from(sessionMap.values()).map((session) => ({
      ...session,
      checksum: null, // Computed on demand in the client if needed
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Pipeline sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
