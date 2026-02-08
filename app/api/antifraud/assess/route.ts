// LEGEND: Antifraud assessment API route — headless endpoint for external consumers
// POST /api/antifraud/assess → RiskAssessment { decision, score, signals }
// All usage must comply with this LEGEND and the LICENSE

import { getSharedVelocityStore } from "@/lib/antifraud-velocity-store";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assessRisk,
  DeviceFingerprintSchema,
  RiskSignalSchema,
  type AssessmentConfig,
} from "../../../../packages/antifraud";
import type { PipelineEvent } from "../../../../packages/pipeline/event";
import { getIsoTimestamp } from "../../../../utils/stamp";

/* ── Request Schema ──────────────────────────────────────── */

const AssessRequestSchema = z.object({
  /** Checkout session ID */
  session_id: z.string().min(1),
  /** Pipeline events for this session (from the tracker) */
  events: z.array(z.object({
    id: z.string(),
    session_id: z.string(),
    pipeline_type: z.string(),
    step: z.string(),
    sequence: z.number().default(0),
    status: z.enum(["success", "failure", "pending", "skipped"]),
    handler: z.string().optional(),
    input_checksum: z.string().optional(),
    output_checksum: z.string().optional(),
    duration_ms: z.number().optional(),
    error: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    timestamp: z.string().datetime(),
  })).default([]),
  /** Buyer email */
  email: z.string().email().optional(),
  /** Client IP (auto-detected from request headers if not provided) */
  ip: z.string().optional(),
  /** Device fingerprint hash */
  device_hash: z.string().optional(),
  /** Full device fingerprint */
  device_fingerprint: DeviceFingerprintSchema.optional(),
  /** Billing country code (ISO 3166-1 alpha-2) */
  billing_country: z.string().length(2).optional(),
  /** IP-inferred country code (ISO 3166-1 alpha-2) */
  ip_country: z.string().length(2).optional(),
  /** Previous chain hash for mutation detection */
  previous_chain_hash: z.string().optional(),
  /** Current chain hash */
  current_chain_hash: z.string().optional(),
  /** Additional custom signals */
  custom_signals: z.array(RiskSignalSchema).optional(),
});

/* ── Route Handler ───────────────────────────────────────── */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = AssessRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: parsed.error.flatten(),
          timestamp: getIsoTimestamp(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Auto-detect IP from request headers if not provided
    const ip = data.ip
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? undefined;

    const config: AssessmentConfig = {
      velocityStore: getSharedVelocityStore(),
    };

    const assessment = await assessRisk({
      input: {
        session_id: data.session_id,
        events: data.events as PipelineEvent[],
        email: data.email,
        ip,
        device_hash: data.device_hash,
        device_fingerprint: data.device_fingerprint,
        billing_country: data.billing_country,
        ip_country: data.ip_country,
        previous_chain_hash: data.previous_chain_hash,
        current_chain_hash: data.current_chain_hash,
        custom_signals: data.custom_signals,
      },
      config,
    });

    return NextResponse.json(assessment, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: getIsoTimestamp(),
      },
      { status: 500 }
    );
  }
}

/* ── GET — health check ──────────────────────────────────── */

export async function GET() {
  return NextResponse.json({
    service: "antifraud",
    status: "operational",
    version: "0.1.0",
    timestamp: getIsoTimestamp(),
  });
}
