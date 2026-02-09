import { z } from "zod";

/* ── Stripe Checkout Session ─────────────────────────────── */

export const StripeLineItemSchema = z.object({
  price_data: z.object({
    currency: z.string().length(3),
    product_data: z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
    unit_amount: z.number().int().min(0).describe("Amount in smallest currency unit (cents)"),
  }),
  quantity: z.number().int().min(1),
});

export const StripeCheckoutInputSchema = z.object({
  mode: z.enum(["payment", "subscription", "setup"]).default("payment"),
  line_items: z.array(StripeLineItemSchema).min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  customer_email: z.string().email().optional(),
  client_reference_id: z.string().optional().describe("Order ID for reconciliation"),
  metadata: z.record(z.string()).optional(),
});

export const StripeCheckoutSessionSchema = z.object({
  id: z.string().startsWith("cs_"),
  url: z.string().url().nullable(),
  status: z.enum(["open", "complete", "expired"]).nullable(),
  payment_status: z.enum(["paid", "unpaid", "no_payment_required"]),
  payment_intent: z.string().nullable().optional(),
  client_secret: z.string().nullable().optional(),
});

/* ── Stripe Webhook Event ────────────────────────────────── */

export const StripeWebhookEventSchema = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string(),
  created: z.number(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
  livemode: z.boolean(),
});

/* ── Stripe Refund ───────────────────────────────────────── */

export const StripeRefundSchema = z.object({
  id: z.string().startsWith("re_"),
  status: z.enum(["succeeded", "pending", "failed", "canceled"]),
  amount: z.number().int().min(0),
  currency: z.string().length(3),
  payment_intent: z.string(),
});

/* ── Stripe Payment Intent ───────────────────────────────── */

export const StripePaymentIntentSchema = z.object({
  id: z.string().startsWith("pi_"),
  status: z.enum([
    "requires_payment_method", "requires_confirmation", "requires_action",
    "processing", "requires_capture", "canceled", "succeeded",
  ]),
  amount: z.number().int().min(0),
  currency: z.string().length(3),
});

export type StripeLineItem = z.infer<typeof StripeLineItemSchema>;
export type StripeCheckoutInput = z.infer<typeof StripeCheckoutInputSchema>;
export type StripeCheckoutSession = z.infer<typeof StripeCheckoutSessionSchema>;
export type StripeWebhookEvent = z.infer<typeof StripeWebhookEventSchema>;
export type StripeRefund = z.infer<typeof StripeRefundSchema>;
export type StripePaymentIntent = z.infer<typeof StripePaymentIntentSchema>;
