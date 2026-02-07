// LEGEND: Example route handler with tracing
// Shows how to instrument a Next.js API route
// All usage must comply with this LEGEND and the LICENSE

import { NextRequest, NextResponse } from "next/server";
import { traceRouteHandler, traceDataFetch } from "@repo/tracing";

/**
 * Example: Trace an API route handler
 *
 * GET /api/example
 */
export async function GET(request: NextRequest) {
  return traceRouteHandler("/api/example", "GET", async () => {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    // Trace data fetching
    const data = await traceDataFetch(`fetchItem:${id}`, async () => {
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        id,
        name: `Item ${id}`,
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(data);
  });
}

/**
 * Example: Trace a POST handler
 *
 * POST /api/example
 */
export async function POST(request: NextRequest) {
  return traceRouteHandler("/api/example", "POST", async () => {
    // Parse body
    const body = await request.json();

    // Validate
    if (!body.name) {
      return NextResponse.json(
        { error: "Missing name field" },
        { status: 400 }
      );
    }

    // Trace creation
    const created = await traceDataFetch("createItem", async () => {
      // Simulate database insert
      await new Promise(resolve => setTimeout(resolve, 150));
      return {
        id: "new123",
        name: body.name,
        createdAt: new Date().toISOString(),
      };
    });

    return NextResponse.json(created, { status: 201 });
  });
}
