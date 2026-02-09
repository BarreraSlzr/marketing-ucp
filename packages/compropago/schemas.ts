import { z } from "zod";

/* ── Compropago Charge (Cash / SPEI) ─────────────────────── */

export const CompropagoChargeInputSchema = z.object({
  order_id: z.string().describe("External order reference"),
  order_name: z.string().describe("Human-readable product/order name"),
  order_price: z.number().describe("Amount in MXN (e.g. 125.50)"),
  customer_name: z.string(),
  customer_email: z.string().email(),
  /** Payment provider: "OXXO", "SEVEN_ELEVEN", "COPPEL", "SPEI", etc. */
  payment_type: z.string().default("OXXO"),
  currency: z.string().length(3).default("MXN"),
  image_url: z.string().url().optional(),
  success_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CompropagoChargeResponseSchema = z.object({
  id: z.string().describe("Compropago charge ID"),
  short_id: z.string().optional(),
  status: z.enum(["charge.pending", "charge.success", "charge.expired", "charge.declined"]),
  order_info: z.object({
    order_id: z.string(),
    order_name: z.string(),
    order_price: z.number(),
  }),
  payment_info: z.object({
    payment_type: z.string(),
    store_reference: z.string().optional().describe("Barcode / CLABE for payment"),
    barcode_url: z.string().url().optional(),
  }).optional(),
  instructions: z.object({
    description: z.string(),
    step_1: z.string().optional(),
    step_2: z.string().optional(),
    step_3: z.string().optional(),
  }).optional(),
  expires_at: z.string().optional(),
});

/* ── Compropago Webhook Event ────────────────────────────── */

export const CompropagoWebhookEventSchema = z.object({
  id: z.string(),
  type: z.enum(["charge.pending", "charge.success", "charge.expired", "charge.declined"]),
  object: z.string().default("event"),
  created: z.number().optional(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

/* ── Compropago SPEI Transfer ────────────────────────────── */

export const CompropagoSpeiResponseSchema = z.object({
  id: z.string(),
  clabe: z.string().length(18).describe("CLABE interbancaria for SPEI deposit"),
  bank_name: z.string(),
  beneficiary_name: z.string(),
  amount: z.number(),
  reference: z.string(),
  expires_at: z.string().optional(),
});

export type CompropagoChargeInput = z.infer<typeof CompropagoChargeInputSchema>;
export type CompropagoChargeResponse = z.infer<typeof CompropagoChargeResponseSchema>;
export type CompropagoWebhookEvent = z.infer<typeof CompropagoWebhookEventSchema>;
export type CompropagoSpeiResponse = z.infer<typeof CompropagoSpeiResponseSchema>;
