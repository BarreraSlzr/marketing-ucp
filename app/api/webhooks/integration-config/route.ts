import { getIsoTimestamp } from "@/utils/stamp";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// LEGEND: Integration config webhook endpoint
// Receives onboarding submissions for integration and automation settings.
// All usage must comply with this LEGEND and the LICENSE

const IntegrationConfigWebhookSchema = z.object({
  event: z.string().min(1),
  templateId: z.string().min(1).optional(),
  category: z.string().optional(),
  regions: z.array(z.string()).optional(),
  values: z.record(z.string(), z.string()).optional(),
  submittedAt: z.string().optional(),
});

type IntegrationConfigWebhookPayload = z.infer<
  typeof IntegrationConfigWebhookSchema
>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = IntegrationConfigWebhookSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid webhook payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload: IntegrationConfigWebhookPayload = parsed.data;

    return NextResponse.json({
      ok: true,
      event: payload.event,
      receivedAt: getIsoTimestamp(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
