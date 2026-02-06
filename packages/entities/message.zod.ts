import { z } from "zod";

export const MessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("error"),
    code: z.string().describe("Error code for programmatic handling"),
    content: z.string().describe("Human-readable error message"),
    path: z.string().optional().describe("JSONPath to the component"),
    severity: z
      .enum(["requires_buyer_input", "requires_merchant_action"])
      .optional(),
  }),
  z.object({
    type: z.literal("info"),
    code: z.string().optional().describe("Info code"),
    content: z.string().describe("Human-readable message"),
    content_type: z.enum(["plain", "markdown"]).default("plain"),
  }),
]);

export type Message = z.infer<typeof MessageSchema>;
