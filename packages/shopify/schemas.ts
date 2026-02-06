import { z } from "zod";

export const ShopifyImageSchema = z.object({
  url: z.string().url(),
});

export const ShopifyVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  price: z.string(),
  availableForSale: z.boolean(),
});

export const ShopifyProductSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  description: z.string().optional(),
  images: z.array(ShopifyImageSchema),
  variants: z.array(ShopifyVariantSchema),
});

export const ShopifyCartLineSchema = z.object({
  id: z.string(),
  quantity: z.number().int().min(1),
});

export const ShopifyCartSchema = z.object({
  id: z.string(),
  checkoutUrl: z.string().url(),
});

export type ShopifyProduct = z.infer<typeof ShopifyProductSchema>;
export type ShopifyCart = z.infer<typeof ShopifyCartSchema>;
export type ShopifyCartLine = z.infer<typeof ShopifyCartLineSchema>;
