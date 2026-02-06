import { z } from "zod";
import { PostalAddressSchema } from "./postal-address.zod";

export const PaymentCredentialSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("token"),
    token: z.string().describe("Payment token value"),
  }),
  z.object({
    type: z.literal("card"),
    card_number: z.string().optional().describe("Masked card number"),
    expiry: z.string().optional().describe("Card expiration MM/YY"),
    brand: z.string().optional().describe("Card brand"),
  }),
]);

export const PaymentSchema = z.object({
  handler: z.string().describe("Payment handler identifier"),
  credential: PaymentCredentialSchema.describe("Payment credential/token"),
  billing_address: PostalAddressSchema.optional().describe("Billing address"),
});

export type PaymentCredential = z.infer<typeof PaymentCredentialSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
