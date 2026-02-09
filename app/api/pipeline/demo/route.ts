import {
    abortDemoGeneration,
    generateDemoPipelineEvents,
} from "@/lib/pipeline-demo";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/pipeline/demo
 *
 * Generates demo pipeline events for testing the UI.
 * Creates sample sessions with events for different pipeline types.
 */
export async function POST(req: NextRequest) {
  try {
    const demoKey = process.env.DEMO_API_KEY;
    if (demoKey) {
      const requestKey = req.headers.get("x-demo-key");
      if (requestKey && requestKey !== demoKey) {
        return NextResponse.json(
          { error: "Unauthorized demo access" },
          { status: 401 }
        );
      }
    }

    const action = req.nextUrl.searchParams.get("action");
    if (action === "stop") {
      const stopped = abortDemoGeneration();
      return NextResponse.json({
        success: stopped,
        message: stopped ? "Demo generation stopped" : "No demo is running",
      });
    }

    const mode = req.nextUrl.searchParams.get("mode") ?? "live";
    const paceParam = req.nextUrl.searchParams.get("paceMs");
    const paceMs = paceParam ? Number.parseInt(paceParam, 10) : undefined;
    const safePace = Number.isFinite(paceMs)
      ? Math.min(Math.max(paceMs as number, 80), 1500)
      : undefined;

    const { sessions, aborted } = await generateDemoPipelineEvents({
      mode: mode === "batch" ? "batch" : "live",
      stepDelayMs: safePace,
    });

    return NextResponse.json({
      success: true,
      message: "Demo pipeline events generated successfully",
      sessions,
      aborted,
    });
  } catch (error) {
    console.error("Pipeline demo generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
