import { z } from "zod";

export const PolarLineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  unit_price: z.number().int().min(0),
  total_price: z.number().int().min(0),
});

export const PolarCheckoutInputSchema = z.object({
  order_id: z.string(),
  currency: z.string().length(3),
  line_items: z.array(PolarLineItemSchema).min(1),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
  customer_email: z.string().email().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const PolarCheckoutSessionSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  status: z.string(),
});

export const PolarWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number().optional(),
  data: z.record(z.unknown()),
});

export type PolarLineItem = z.infer<typeof PolarLineItemSchema>;
export type PolarCheckoutInput = z.infer<typeof PolarCheckoutInputSchema>;
export type PolarCheckoutSession = z.infer<typeof PolarCheckoutSessionSchema>;
export type PolarWebhookEvent = z.infer<typeof PolarWebhookEventSchema>;
