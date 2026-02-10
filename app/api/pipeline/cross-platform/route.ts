import { NextRequest, NextResponse } from "next/server";
import { getCrossPlatformSessionData } from "@/packages/pipeline/cross-platform-bridge";

/**
 * GET /api/pipeline/cross-platform
 * Fetches unified session data from internal and external platforms
 * 
 * Query params:
 * - sessionId: Internal session ID (required)
 * - platform: External platform(s) to fetch (optional, multiple allowed)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const platforms = searchParams.getAll("platform");

    const data = await getCrossPlatformSessionData({
      sessionId,
      platforms: platforms.length > 0 ? platforms : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch cross-platform data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cross-platform data" },
      { status: 500 }
    );
  }
}
