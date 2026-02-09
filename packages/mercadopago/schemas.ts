import { z } from "zod";

/* ── MercadoPago Preference (Checkout Pro) ───────────────── */

export const MercadoPagoItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  currency_id: z.string().length(3).default("MXN"),
  unit_price: z.number().describe("Price in currency units (e.g. 125.00)"),
  quantity: z.number().int().min(1),
  picture_url: z.string().url().optional(),
});

export const MercadoPagoPreferenceInputSchema = z.object({
  items: z.array(MercadoPagoItemSchema).min(1),
  payer: z.object({
    name: z.string().optional(),
    surname: z.string().optional(),
    email: z.string().email().optional(),
  }).optional(),
  back_urls: z.object({
    success: z.string().url(),
    failure: z.string().url(),
    pending: z.string().url().optional(),
  }),
  auto_return: z.enum(["approved", "all"]).optional().default("approved"),
  external_reference: z.string().optional().describe("Order ID for reconciliation"),
  notification_url: z.string().url().optional(),
  /** Enable installments (parcelas / meses sin intereses) */
  payment_methods: z.object({
    installments: z.number().int().min(1).optional().describe("Max installments"),
    excluded_payment_types: z.array(z.object({ id: z.string() })).optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const MercadoPagoPreferenceResponseSchema = z.object({
  id: z.string().describe("Preference ID"),
  init_point: z.string().url().describe("Checkout Pro redirect URL"),
  sandbox_init_point: z.string().url().describe("Sandbox checkout URL"),
  external_reference: z.string().nullable().optional(),
});

/* ── MercadoPago Payment ─────────────────────────────────── */

export const MercadoPagoPaymentSchema = z.object({
  id: z.number(),
  status: z.enum([
    "pending", "approved", "authorized", "in_process",
    "in_mediation", "rejected", "cancelled", "refunded", "charged_back",
  ]),
  status_detail: z.string(),
  transaction_amount: z.number(),
  currency_id: z.string().length(3),
  installments: z.number().int().optional(),
  external_reference: z.string().nullable().optional(),
  payment_method_id: z.string().optional(),
  payment_type_id: z.string().optional(),
});

/* ── MercadoPago Webhook ─────────────────────────────────── */

export const MercadoPagoWebhookSchema = z.object({
  id: z.number().optional(),
  live_mode: z.boolean().optional(),
  type: z.string(),
  date_created: z.string().optional(),
  action: z.string(),
  data: z.object({
    id: z.string().or(z.number()),
  }),
});

/* ── MercadoPago Refund ──────────────────────────────────── */

export const MercadoPagoRefundSchema = z.object({
  id: z.number(),
  payment_id: z.number(),
  amount: z.number(),
  status: z.enum(["approved", "pending", "rejected"]),
  date_created: z.string(),
});

export type MercadoPagoItem = z.infer<typeof MercadoPagoItemSchema>;
export type MercadoPagoPreferenceInput = z.infer<typeof MercadoPagoPreferenceInputSchema>;
export type MercadoPagoPreferenceResponse = z.infer<typeof MercadoPagoPreferenceResponseSchema>;
export type MercadoPagoPayment = z.infer<typeof MercadoPagoPaymentSchema>;
export type MercadoPagoWebhook = z.infer<typeof MercadoPagoWebhookSchema>;
export type MercadoPagoRefund = z.infer<typeof MercadoPagoRefundSchema>;
