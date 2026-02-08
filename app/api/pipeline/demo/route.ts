import { generateDemoPipelineEvents } from "@/lib/pipeline-demo";
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

    const { sessions } = await generateDemoPipelineEvents();

    return NextResponse.json({
      success: true,
      message: "Demo pipeline events generated successfully",
      sessions,
    });
  } catch (error) {
    console.error("Pipeline demo generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
