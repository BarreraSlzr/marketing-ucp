import { z } from "zod";

export const PostalAddressSchema = z.object({
  line1: z.string().min(1).describe("Street address line 1"),
  line2: z.string().optional().describe("Street address line 2"),
  city: z.string().min(1).describe("City"),
  state: z.string().optional().describe("State/Province/Region"),
  postal_code: z.string().min(1).describe("Postal/ZIP code"),
  country: z
    .string()
    .length(2)
    .describe("ISO 3166-1 alpha-2 country code"),
});

export type PostalAddress = z.infer<typeof PostalAddressSchema>;
