import { z } from "zod";
import { PostalAddressSchema } from "./postal-address.zod";

export const BuyerSchema = z.object({
  email: z.string().email().describe("Buyer's email address"),
  phone: z.string().optional().describe("Buyer's phone number"),
  first_name: z.string().optional().describe("Buyer's first name"),
  last_name: z.string().optional().describe("Buyer's last name"),
  billing_address: PostalAddressSchema.optional().describe("Billing address"),
  shipping_address: PostalAddressSchema.optional().describe("Shipping address"),
  customer_id: z.string().optional().describe("Existing customer identifier"),
  accepts_marketing: z.boolean().optional().describe("Marketing consent"),
});

export type Buyer = z.infer<typeof BuyerSchema>;
