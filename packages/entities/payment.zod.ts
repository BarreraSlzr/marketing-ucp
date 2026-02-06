import { z } from 'zod';

export const PaymentSchema = z.object({
  handler: z.string().describe("Payment handler identifier"),
  credential: PaymentCredentialSchema.describe("Payment credential/token"),
  billing_address: PostalAddressSchema.optional().describe("Billing address")
});

export const PaymentCredentialSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("token"),
    token: z.string().describe("Payment token value")
  }),
  z.object({
    type: z.literal("card"),
    // Card details would go here
  })
]);