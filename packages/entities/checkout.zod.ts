import { z } from 'zod';

export const CheckoutSchema = z.object({
  id: z.string().describe("Unique identifier of the checkout session"),
  line_items: z.array(LineItemSchema).min(1).describe("List of line items being checked out"),
  buyer: BuyerSchema.optional().describe("Representation of the buyer"),
  status: z.enum([
    "incomplete",
    "requires_escalation", 
    "ready_for_complete",
    "complete_in_progress",
    "completed",
    "canceled"
  ]).describe("Checkout state indicating the current phase"),
  currency: z.string().length(3).describe("ISO 4217 currency code"),
  totals: z.array(TotalSchema).describe("Different cart totals"),
  messages: z.array(MessageSchema).optional().describe("List of messages with error and info"),
  links: z.array(LinkSchema).describe("Links to be displayed (Privacy Policy, TOS)"),
  expires_at: z.string().datetime().optional().describe("Checkout expiration timestamp"),
  payment: PaymentSchema.optional().describe("Payment information"),
  ucp: UCPCheckoutResponseSchema
});