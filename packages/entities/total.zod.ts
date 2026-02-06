import { z } from "zod";

export const TotalSchema = z.object({
  type: z
    .enum(["subtotal", "tax", "shipping", "discount", "grand_total"])
    .describe("Type of total"),
  label: z.string().describe("Human-readable label"),
  amount: z.number().describe("Amount in minor currency units"),
});

export type Total = z.infer<typeof TotalSchema>;
