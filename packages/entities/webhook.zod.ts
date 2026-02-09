import { z } from "zod";
import { OrderSchema } from "./order.zod";

export const WebhookEventTypeSchema = z.enum([
  "order.created",
  "order.confirmed",
  "order.shipped",
  "order.delivered",
  "order.failed",
  "order.refunded",
  "order.canceled",
  "payment.confirmed",
  "payment.failed",
  "payment.refunded",
  "discount.applied",
  "tax.calculated",
  "dispute.opened",
  "dispute.evidence_submitted",
  "dispute.escalated",
  "dispute.resolved",
  "dispute.closed",
  "refund.requested",
  "refund.approved",
  "refund.processed",
  "refund.rejected",
]);

export const WebhookEventSchema = z.object({
  id: z.string().describe("Unique webhook event ID"),
  type: WebhookEventTypeSchema.describe("Event type"),
  timestamp: z.string().datetime().describe("Event occurrence time"),
  source: z
    .enum(["stripe", "polar", "shopify", "thirdweb", "paypal-mx", "mercadopago", "compropago", "stp", "custom"])
    .describe("Event source / payment handler"),
  order: OrderSchema.optional().describe("Related order (if applicable)"),
  data: z.record(z.any()).describe("Event-specific payload"),
  signature: z.string().optional().describe("HMAC signature for verification"),
  retry_count: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Number of retry attempts"),
});

export const WebhookProcessingStateSchema = z.object({
  event_id: z.string(),
  status: z.enum(["pending", "processing", "success", "failed"]),
  error: z.string().optional(),
  processed_at: z.string().datetime().optional(),
  next_retry_at: z.string().datetime().optional(),
});

export type WebhookEventType = z.infer<typeof WebhookEventTypeSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type WebhookProcessingState = z.infer<
  typeof WebhookProcessingStateSchema
>;
