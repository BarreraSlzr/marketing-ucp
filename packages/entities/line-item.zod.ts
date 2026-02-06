import { z } from "zod";

export const LineItemSchema = z.object({
  id: z.string().describe("Unique identifier for the line item"),
  name: z.string().describe("Product or service name"),
  description: z.string().optional().describe("Description of the item"),
  quantity: z.number().int().min(1).describe("Quantity"),
  unit_price: z.number().min(0).describe("Unit price in minor currency units"),
  total_price: z.number().min(0).describe("Total price for this line item"),
  image_url: z.string().url().optional().describe("Product image URL"),
  sku: z.string().optional().describe("Stock keeping unit"),
});

export type LineItem = z.infer<typeof LineItemSchema>;
