import {
  createPipelineEvent,
  PIPELINE_CHECKOUT_DIGITAL,
  PIPELINE_CHECKOUT_PHYSICAL,
  type PipelineType,
} from "@repo/pipeline";
import { NextRequest, NextResponse } from "next/server";
import { getGlobalTracker, registerSessionId } from "@/lib/pipeline-tracker";

/**
 * POST /api/pipeline/demo
 *
 * Generates demo pipeline events for testing the UI.
 * Creates sample sessions with events for different pipeline types.
 */
export async function POST(req: NextRequest) {
  try {
    const tracker = getGlobalTracker();

    // Generate demo sessions
    const demoSessions = [
      {
        session_id: "demo_physical_001",
        pipeline_type: "checkout_physical" as PipelineType,
        steps: [
          { step: "buyer_validated", status: "success" as const, duration_ms: 120 },
          { step: "address_validated", status: "success" as const, duration_ms: 85 },
          { step: "payment_initiated", status: "success" as const, duration_ms: 340 },
          { step: "payment_confirmed", status: "success" as const, duration_ms: 1200 },
          { step: "fulfillment_delegated", status: "success" as const, duration_ms: 200 },
          { step: "checkout_completed", status: "success" as const, duration_ms: 50 },
        ],
      },
      {
        session_id: "demo_digital_001",
        pipeline_type: "checkout_digital" as PipelineType,
        steps: [
          { step: "buyer_validated", status: "success" as const, duration_ms: 95 },
          { step: "payment_initiated", status: "success" as const, duration_ms: 280 },
          { step: "payment_confirmed", status: "success" as const, duration_ms: 950 },
          { step: "checkout_completed", status: "success" as const, duration_ms: 45 },
        ],
      },
      {
        session_id: "demo_failed_001",
        pipeline_type: "checkout_physical" as PipelineType,
        steps: [
          { step: "buyer_validated", status: "success" as const, duration_ms: 110 },
          { step: "address_validated", status: "success" as const, duration_ms: 90 },
          { step: "payment_initiated", status: "success" as const, duration_ms: 320 },
          { step: "payment_confirmed", status: "failure" as const, duration_ms: 1500, error: "Payment declined" },
          { step: "payment_confirmed", status: "success" as const, duration_ms: 1400, sequence: 1 },
          { step: "fulfillment_delegated", status: "success" as const, duration_ms: 180 },
          { step: "checkout_completed", status: "success" as const, duration_ms: 60 },
        ],
      },
    ];

    // Create events for each session
    for (const session of demoSessions) {
      registerSessionId(session.session_id);

      for (const stepData of session.steps) {
        const event = createPipelineEvent({
          session_id: session.session_id,
          pipeline_type: session.pipeline_type,
          step: stepData.step as any,
          status: stepData.status,
          duration_ms: stepData.duration_ms,
          sequence: stepData.sequence || 0,
          error: stepData.error,
          handler: "demo",
          input_checksum: "a".repeat(64),
          output_checksum: "b".repeat(64),
          metadata: {
            demo: true,
            generated_at: new Date().toISOString(),
          },
        });

        const definition =
          session.pipeline_type === "checkout_physical"
            ? PIPELINE_CHECKOUT_PHYSICAL
            : PIPELINE_CHECKOUT_DIGITAL;

        await tracker.trackEvent({ event, definition });

        // Small delay to ensure chronological order
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Demo pipeline events generated successfully",
      sessions: demoSessions.map((s) => ({
        session_id: s.session_id,
        pipeline_type: s.pipeline_type,
        event_count: s.steps.length,
      })),
    });
  } catch (error) {
    console.error("Pipeline demo generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
