import { z } from "zod";

export const LinkSchema = z.object({
  rel: z
    .enum(["privacy_policy", "terms_of_service", "return_policy", "support"])
    .describe("Link relationship type"),
  href: z.string().url().describe("Link URL"),
  label: z.string().describe("Human-readable label"),
});

export type Link = z.infer<typeof LinkSchema>;
