import { z } from "zod";
import { BuyerSchema } from "./buyer.zod";
import { CheckoutSchema } from "./checkout.zod";
import { LinkSchema } from "./link.zod";
import { TotalSchema } from "./total.zod";
import { UCPCheckoutResponseSchema } from "./ucp-metadata.zod";

export const CheckoutLineItemInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().min(1),
  unit_price: z.number().int().min(0),
  total_price: z.number().int().min(0).optional(),
  image_url: z.string().url().optional(),
  sku: z.string().optional(),
});

export const CheckoutApiRequestSchema = z.object({
  currency: z
    .string()
    .length(3)
    .transform((value) => value.toUpperCase()),
  locale: z.string().optional(),
  buyer: BuyerSchema.optional(),
  line_items: z.array(CheckoutLineItemInputSchema).min(1),
  links: z.array(LinkSchema).optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const CheckoutApiResponseSchema = z.object({
  checkout: CheckoutSchema,
  checkout_url: z.string().url(),
  totals: z.array(TotalSchema),
  ucp: UCPCheckoutResponseSchema,
  locale: z.string().optional(),
});

export type CheckoutLineItemInput = z.infer<
  typeof CheckoutLineItemInputSchema
>;
export type CheckoutApiRequest = z.infer<typeof CheckoutApiRequestSchema>;
export type CheckoutApiResponse = z.infer<typeof CheckoutApiResponseSchema>;
