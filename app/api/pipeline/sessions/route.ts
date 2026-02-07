import {
  PIPELINE_DEFINITIONS,
  getPipelineDefinition,
  type PipelineEvent,
} from "@repo/pipeline";
import { NextRequest, NextResponse } from "next/server";
import { getGlobalTracker, getAllSessionIds } from "@/lib/pipeline-tracker";

/**
 * GET /api/pipeline/sessions
 *
 * Returns all pipeline sessions with their events and checksums.
 * Groups events by session_id for the UI.
 */
export async function GET(req: NextRequest) {
  try {
    const tracker = getGlobalTracker();
    const sessionIdList = getAllSessionIds();

    // Get events and checksums for each session
    const sessions = await Promise.all(
      sessionIdList.map(async (session_id) => {
        const events = await tracker.getEvents({ session_id });

        if (events.length === 0) {
          return null;
        }

        // Get the pipeline type from the first event
        const pipeline_type = events[0].pipeline_type;
        const definition = getPipelineDefinition({ type: pipeline_type });

        let checksum = null;
        if (definition) {
          try {
            checksum = await tracker.getCurrentChecksum({
              session_id,
              definition,
            });
          } catch (err) {
            console.warn(`Failed to compute checksum for ${session_id}:`, err);
          }
        }

        const last_updated =
          events.length > 0
            ? events[events.length - 1].timestamp
            : new Date().toISOString();

        return {
          session_id,
          pipeline_type,
          events,
          checksum,
          last_updated,
        };
      })
    );

    // Filter out null entries
    const validSessions = sessions.filter((s) => s !== null);

    return NextResponse.json({ sessions: validSessions });
  } catch (error) {
    console.error("Pipeline sessions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
