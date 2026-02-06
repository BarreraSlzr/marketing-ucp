import { z } from "zod";
import { LineItemSchema } from "./line-item.zod";
import { BuyerSchema } from "./buyer.zod";
import { TotalSchema } from "./total.zod";
import { PaymentSchema } from "./payment.zod";

export const OrderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "refunded",
  "failed",
  "canceled",
]);

export const OrderSchema = z.object({
  id: z.string().describe("Unique order identifier"),
  checkout_id: z.string().optional().describe("Reference to checkout session"),
  status: OrderStatusSchema.describe("Order lifecycle state"),
  buyer: BuyerSchema.describe("Buyer information"),
  line_items: z
    .array(LineItemSchema)
    .min(1)
    .describe("Items ordered"),
  totals: z.array(TotalSchema).describe("Order totals"),
  payment: PaymentSchema.describe("Payment details"),
  currency: z.string().length(3).describe("ISO 4217 currency code"),
  created_at: z.string().datetime().describe("Order creation timestamp"),
  updated_at: z.string().datetime().describe("Last update timestamp"),
  tracking_number: z
    .string()
    .optional()
    .describe("Fulfillment tracking number"),
  external_id: z
    .string()
    .optional()
    .describe("External order ID (Shopify, Polar, etc.)"),
  metadata: z
    .record(z.any())
    .optional()
    .describe("Custom metadata"),
});

export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type Order = z.infer<typeof OrderSchema>;
