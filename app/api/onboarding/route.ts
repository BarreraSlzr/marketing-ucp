import { getIsoTimestamp } from "@/utils/stamp";
import {
    OnboardingSubmissionSchema,
    getOnboardingTemplate,
    validateSubmission,
} from "@repo/onboarding";
import { NextRequest, NextResponse } from "next/server";

// LEGEND: Onboarding API endpoint
// Receives adapter onboarding form submissions, validates, and optionally
// forwards to the template's webhook URL.
// All usage must comply with this LEGEND and the LICENSE

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse submission
    const parsed = OnboardingSubmissionSchema.safeParse({
      ...body,
      updatedAt: body.updatedAt ?? getIsoTimestamp(),
      status: body.status ?? "submitted",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission format", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const submission = parsed.data;

    // Retrieve template to validate against
    const template = getOnboardingTemplate({ id: submission.templateId });
    if (!template) {
      return NextResponse.json(
        { error: `Unknown template: ${submission.templateId}` },
        { status: 404 }
      );
    }

    // Validate field values
    const validation = validateSubmission({
      template,
      values: submission.values,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          fieldErrors: validation.errors,
        },
        { status: 422 }
      );
    }

    // Forward to webhook if configured
    let webhookResult: { sent: boolean; statusCode?: number } = {
      sent: false,
    };

    if (template.webhookUrl) {
      try {
        const webhookRes = await fetch(template.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "onboarding.submitted",
            templateId: submission.templateId,
            adapterName: template.name,
            category: template.category,
            regions: template.regions,
            values: submission.values,
            submittedAt: submission.updatedAt,
          }),
        });
        webhookResult = { sent: true, statusCode: webhookRes.status };
      } catch {
        webhookResult = { sent: false };
      }
    }

    return NextResponse.json({
      ok: true,
      templateId: submission.templateId,
      status: "submitted",
      webhookResult,
      submittedAt: submission.updatedAt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Import templates side-effect (registers all templates)
  const { ALL_ONBOARDING_TEMPLATES } = await import("@repo/onboarding");

  return NextResponse.json({
    templates: ALL_ONBOARDING_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      regions: t.regions,
      fieldCount: t.fields.length,
      requiredFieldCount: t.fields.filter((f) => f.required).length,
      version: t.version,
      docsUrl: t.docsUrl,
    })),
  });
}
