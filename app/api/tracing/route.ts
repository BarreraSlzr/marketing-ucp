// LEGEND: API endpoint for exporting trace data
// Exports traces in Chrome Trace Event format for DevTools/Perfetto
// All usage must comply with this LEGEND and the LICENSE

import { NextRequest, NextResponse } from "next/server";
import { getGlobalCollector } from "@repo/tracing";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const traceId = searchParams.get("traceId");
  const format = searchParams.get("format") ?? "json";

  const collector = getGlobalCollector();

  try {
    if (format === "json") {
      const json = collector.exportJson({
        traceId: traceId ?? undefined,
        includeIncomplete: false,
      });

      return new NextResponse(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="trace-${traceId ?? "all"}.json"`,
        },
      });
    }

    if (format === "stats") {
      const stats = collector.getStats();
      return NextResponse.json(stats);
    }

    if (format === "spans") {
      const spans = traceId
        ? collector.getSpansByTrace(traceId)
        : collector.getSpans();

      return NextResponse.json({
        spans,
        count: spans.length,
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use 'json', 'stats', or 'spans'" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const collector = getGlobalCollector();
  collector.clear();

  return NextResponse.json({
    message: "All traces cleared",
  });
}
