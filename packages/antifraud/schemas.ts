// LEGEND: Antifraud Zod schemas — structured types for risk signals, assessments, and device fingerprints
// These schemas define the antifraud domain model used across the risk scoring engine
// All usage must comply with this LEGEND and the LICENSE

import { z } from "zod";

/* ── Risk Signal ─────────────────────────────────────────── */

/** A single risk signal emitted by a signal collector */
export const RiskSignalSchema = z
  .object({
    /** Signal type identifier (e.g. "velocity_email", "geo_mismatch") */
    signal: z.string().min(1).optional(),
    /** Friendly signal name for dashboards */
    name: z.string().min(1).optional(),
    /** Raw score contribution from this signal (0–100) */
    score: z.number().min(0).max(100),
    /** Human-readable reason for the signal */
    reason: z.string().min(1).optional(),
    /** Legacy/alternate description field */
    description: z.string().min(1).optional(),
    /** Weight multiplier applied to this signal's score */
    weight: z.number().min(0).max(5).default(1.0),
    /** Optional detection timestamp (ISO-8601) */
    detected_at: z.string().datetime().optional(),
    /** Additional context for debugging/auditing */
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((data) => data.signal || data.name, {
    message: "RiskSignal must include signal or name",
  })
  .refine((data) => data.reason || data.description, {
    message: "RiskSignal must include reason or description",
  });

export type RiskSignal = z.infer<typeof RiskSignalSchema>;

/* ── Risk Decision ───────────────────────────────────────── */

export const RiskDecisionSchema = z.enum(["allow", "review", "block"]);
export type RiskDecision = z.infer<typeof RiskDecisionSchema>;

/* ── Risk Assessment ─────────────────────────────────────── */

/** Complete risk assessment for a checkout session */
export const RiskAssessmentSchema = z.object({
  /** Checkout session ID — the universal traveler */
  session_id: z.string().min(1),
  /** Weighted total score (0–100) */
  total_score: z.number().min(0).max(100),
  /** Final decision based on threshold comparison */
  decision: RiskDecisionSchema,
  /** All signals that contributed to the assessment */
  signals: z.array(RiskSignalSchema),
  /** Pipeline chain hash at the time of assessment — for tamper detection */
  chain_hash: z.string().optional(),
  /** ISO-8601 timestamp of assessment — uses canonical getIsoTimestamp() */
  assessed_at: z.string().datetime(),
});

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;

/* ── Device Fingerprint ──────────────────────────────────── */

/** Client-side device fingerprint collected by the extended ClientTracer */
export const DeviceFingerprintSchema = z.object({
  /** User agent string */
  user_agent: z.string().optional(),
  /** Screen resolution (e.g. "1920x1080") */
  screen_resolution: z.string().optional(),
  /** Browser language (e.g. "en-US") */
  language: z.string().optional(),
  /** Timezone offset in minutes */
  timezone_offset: z.number().optional(),
  /** IANA timezone (e.g. "America/New_York") */
  timezone: z.string().optional(),
  /** Platform (e.g. "MacIntel", "Win32") */
  platform: z.string().optional(),
  /** Number of logical CPU cores */
  hardware_concurrency: z.number().optional(),
  /** Device memory in GB (if available) */
  device_memory: z.number().optional(),
  /** Max touch points (0 for non-touch) */
  max_touch_points: z.number().optional(),
  /** WebGL renderer string */
  webgl_renderer: z.string().optional(),
  /** Canvas fingerprint hash */
  canvas_hash: z.string().optional(),
  /** Whether cookies are enabled */
  cookies_enabled: z.boolean().optional(),
  /** Whether Do Not Track is set */
  do_not_track: z.boolean().optional(),
  /** Color depth */
  color_depth: z.number().optional(),
  /** Installed plugins count */
  plugin_count: z.number().optional(),
});

export type DeviceFingerprint = z.infer<typeof DeviceFingerprintSchema>;

/* ── Velocity Record ─────────────────────────────────────── */

/** A single velocity record used for rate limiting checks */
export const VelocityRecordSchema = z.object({
  /** The key being tracked (email, IP, device hash) */
  key: z.string().min(1),
  /** Key type */
  key_type: z.enum(["email", "ip", "device"]),
  /** Session IDs seen in this window */
  session_ids: z.array(z.string()),
  /** Window start (ISO-8601) */
  window_start: z.string().datetime(),
  /** Window end (ISO-8601) */
  window_end: z.string().datetime(),
  /** Number of sessions in this window */
  count: z.number().nonnegative(),
});

export type VelocityRecord = z.infer<typeof VelocityRecordSchema>;

/* ── Antifraud Pipeline Event Metadata ───────────────────── */

/** Metadata shape for the "fraud_check" pipeline step */
export const FraudCheckMetadataSchema = z.object({
  /** The risk assessment that was computed */
  assessment: RiskAssessmentSchema,
  /** Device fingerprint used in assessment */
  device_fingerprint: DeviceFingerprintSchema.optional(),
  /** Whether the result was cached / previously computed */
  cached: z.boolean().default(false),
});

export type FraudCheckMetadata = z.infer<typeof FraudCheckMetadataSchema>;

/* ── Merchant Feedback ───────────────────────────────────── */

/** Merchant feedback on a risk assessment — used for scoring improvement */
export const MerchantFeedbackSchema = z.object({
  /** Session ID the feedback applies to */
  session_id: z.string().min(1),
  /** Merchant's verdict */
  verdict: z.enum(["legitimate", "fraudulent", "uncertain"]),
  /** Optional reason for the verdict */
  reason: z.string().optional(),
  /** ISO-8601 timestamp of feedback */
  feedback_at: z.string().datetime(),
});

export type MerchantFeedback = z.infer<typeof MerchantFeedbackSchema>;
