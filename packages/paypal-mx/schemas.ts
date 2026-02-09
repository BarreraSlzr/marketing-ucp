import { z } from "zod";

/* ── PayPal MX Checkout ──────────────────────────────────── */

export const PayPalMxLineItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  unit_amount: z.object({
    currency_code: z.string().length(3).default("MXN"),
    value: z.string().describe("Decimal string e.g. '125.00'"),
  }),
  quantity: z.string().describe("Quantity as string per PayPal API"),
});

export const PayPalMxCheckoutInputSchema = z.object({
  intent: z.enum(["CAPTURE", "AUTHORIZE"]).default("CAPTURE"),
  purchase_units: z.array(
    z.object({
      reference_id: z.string().optional().describe("Order ID for reconciliation"),
      description: z.string().optional(),
      amount: z.object({
        currency_code: z.string().length(3).default("MXN"),
        value: z.string().describe("Total amount as decimal string"),
        breakdown: z.object({
          item_total: z.object({
            currency_code: z.string().length(3).default("MXN"),
            value: z.string(),
          }),
        }).optional(),
      }),
      items: z.array(PayPalMxLineItemSchema).optional(),
    })
  ).min(1),
  application_context: z.object({
    return_url: z.string().url(),
    cancel_url: z.string().url(),
    brand_name: z.string().optional(),
    locale: z.string().optional().default("es-MX"),
    landing_page: z.enum(["LOGIN", "BILLING", "NO_PREFERENCE"]).optional(),
    user_action: z.enum(["PAY_NOW", "CONTINUE"]).optional().default("PAY_NOW"),
  }),
});

export const PayPalMxOrderResponseSchema = z.object({
  id: z.string().describe("PayPal order ID"),
  status: z.enum([
    "CREATED", "SAVED", "APPROVED", "VOIDED", "COMPLETED", "PAYER_ACTION_REQUIRED",
  ]),
  links: z.array(
    z.object({
      href: z.string().url(),
      rel: z.string(),
      method: z.string().optional(),
    })
  ),
});

/* ── PayPal MX Webhook Event ─────────────────────────────── */

export const PayPalMxWebhookEventSchema = z.object({
  id: z.string(),
  event_type: z.string(),
  resource_type: z.string(),
  create_time: z.string(),
  resource: z.record(z.unknown()),
  summary: z.string().optional(),
});

/* ── PayPal MX Refund ────────────────────────────────────── */

export const PayPalMxRefundSchema = z.object({
  id: z.string(),
  status: z.enum(["COMPLETED", "PENDING", "CANCELLED"]),
  amount: z.object({
    currency_code: z.string().length(3),
    value: z.string(),
  }),
});

/* ── PayPal MX Capture ───────────────────────────────────── */

export const PayPalMxCaptureSchema = z.object({
  id: z.string(),
  status: z.enum(["COMPLETED", "DECLINED", "PARTIALLY_REFUNDED", "PENDING", "REFUNDED"]),
  amount: z.object({
    currency_code: z.string().length(3),
    value: z.string(),
  }),
});

export type PayPalMxLineItem = z.infer<typeof PayPalMxLineItemSchema>;
export type PayPalMxCheckoutInput = z.infer<typeof PayPalMxCheckoutInputSchema>;
export type PayPalMxOrderResponse = z.infer<typeof PayPalMxOrderResponseSchema>;
export type PayPalMxWebhookEvent = z.infer<typeof PayPalMxWebhookEventSchema>;
export type PayPalMxRefund = z.infer<typeof PayPalMxRefundSchema>;
export type PayPalMxCapture = z.infer<typeof PayPalMxCaptureSchema>;
