import { z } from "zod";

// LEGEND: Canonical onboarding schemas
// These Zod schemas define the shape of adapter onboarding form templates
// All usage must comply with this LEGEND and the LICENSE

/* ── Field Types ─────────────────────────────────────────── */
export const OnboardingFieldTypeSchema = z.enum([
  "text",
  "email",
  "password",
  "url",
  "tel",
  "select",
  "multi_select",
  "checkbox",
  "textarea",
  "file",
  "hidden",
]);
export type OnboardingFieldType = z.infer<typeof OnboardingFieldTypeSchema>;

/* ── Single Field Definition ─────────────────────────────── */
export const OnboardingFieldSchema = z.object({
  /** Machine-readable identifier, maps to env var or config key */
  key: z.string().min(1),
  /** Human-readable label */
  label: z.string().min(1),
  /** Input type for rendering */
  type: OnboardingFieldTypeSchema.default("text"),
  /** Placeholder text */
  placeholder: z.string().optional(),
  /** Help text shown below the field */
  description: z.string().optional(),
  /** Whether the field must be filled */
  required: z.boolean().default(true),
  /** Pre-filled value */
  defaultValue: z.string().optional(),
  /** For select fields: available options */
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  /** Validation regex pattern */
  pattern: z.string().optional(),
  /** Custom validation error message */
  patternMessage: z.string().optional(),
  /** Logical group for rendering sections */
  group: z.string().default("general"),
  /** Corresponding environment variable name (informational) */
  envVar: z.string().optional(),
  /** Display order within group */
  order: z.number().default(0),
});
export type OnboardingField = z.infer<typeof OnboardingFieldSchema>;

/* ── Form Status ─────────────────────────────────────────── */
export const OnboardingFormStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "requires_changes",
]);
export type OnboardingFormStatus = z.infer<typeof OnboardingFormStatusSchema>;

/* ── Full Onboarding Template ────────────────────────────── */
export const OnboardingTemplateSchema = z.object({
  /** Unique adapter identifier (matches PaymentHandler id) */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Short description of the adapter/service */
  description: z.string(),
  /** Service category */
  category: z.enum([
    "payment",
    "storefront",
    "web3",
    "bank_transfer",
    "cash_payment",
    "compliance",
    "subscription",
    "integration",
    "automation",
    "dispute",
    "refund",
    "support",
    "feedback",
  ]),
  /** Country/region applicability (ISO 3166 codes) */
  regions: z.array(z.string()).default(["global"]),
  /** Logo or icon URL (optional) */
  iconUrl: z.string().url().optional(),
  /** Documentation link */
  docsUrl: z.string().url().optional(),
  /** Required fields for onboarding */
  fields: z.array(OnboardingFieldSchema).min(1),
  /** Webhook URL to call on form submit (optional) */
  webhookUrl: z.string().url().optional(),
  /** Version of the template schema */
  version: z.string().default("2026-02-08"),
});
export type OnboardingTemplate = z.infer<typeof OnboardingTemplateSchema>;

/* ── Submission (filled form data) ───────────────────────── */
export const OnboardingSubmissionSchema = z.object({
  /** Reference to the template id */
  templateId: z.string().min(1),
  /** Key-value pairs of form responses */
  values: z.record(z.string(), z.string()),
  /** Current status */
  status: OnboardingFormStatusSchema.default("draft"),
  /** Timestamp of last update */
  updatedAt: z.string(),
  /** Submission metadata */
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type OnboardingSubmission = z.infer<typeof OnboardingSubmissionSchema>;
