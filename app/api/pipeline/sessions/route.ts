import {
  PipelineTracker,
  PIPELINE_DEFINITIONS,
  getPipelineDefinition,
  type PipelineType,
} from "@repo/pipeline";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/pipeline/sessions
 *
 * Returns all pipeline sessions with their events and checksums.
 * Groups events by session_id for the UI.
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: In production, inject persistent storage
    const tracker = new PipelineTracker();

    // Get all events from storage
    // For now, we'll simulate with in-memory storage which starts empty
    // In a real app, this would fetch from a database

    // For demo purposes, we can generate some sample data
    const sessions: {
      session_id: string;
      pipeline_type: string;
      events: any[];
      checksum: any;
      last_updated: string;
    }[] = [];

    // Since in-memory storage starts empty, return empty sessions
    // The user can add events via POST /api/pipeline/track

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Pipeline sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
