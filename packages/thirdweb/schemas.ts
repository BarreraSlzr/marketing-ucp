import { z } from "zod";

/* ── Thirdweb Pay Checkout ───────────────────────────────── */

export const ThirdwebCheckoutInputSchema = z.object({
  title: z.string().optional(),
  seller_address: z.string().describe("Recipient wallet address (0x…)"),
  chain_id: z.number().int().min(1),
  token_address: z.string().describe("ERC-20 token contract (0x0 for native)"),
  amount: z.string().describe("Amount in token's smallest unit as string"),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  client_reference_id: z.string().optional().describe("Order ID for reconciliation"),
  metadata: z.record(z.unknown()).optional(),
});

export const ThirdwebCheckoutSessionSchema = z.object({
  id: z.string(),
  checkout_url: z.string().url(),
  status: z.string(),
});

/* ── Thirdweb Webhook Event ──────────────────────────────── */

export const ThirdwebWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created_at: z.string().optional(),
  data: z.object({
    transaction_hash: z.string().optional(),
    wallet_address: z.string().optional(),
    chain_id: z.number().optional(),
    amount: z.string().optional(),
    token_address: z.string().optional(),
    status: z.string().optional(),
  }).catchall(z.unknown()),
});

/* ── Thirdweb Transaction Status ─────────────────────────── */

export const ThirdwebTransactionStatusSchema = z.object({
  transaction_hash: z.string(),
  status: z.enum(["pending", "confirmed", "failed"]),
  chain_id: z.number().int(),
  amount: z.string(),
  token_address: z.string(),
});

export type ThirdwebCheckoutInput = z.infer<typeof ThirdwebCheckoutInputSchema>;
export type ThirdwebCheckoutSession = z.infer<typeof ThirdwebCheckoutSessionSchema>;
export type ThirdwebWebhookEvent = z.infer<typeof ThirdwebWebhookEventSchema>;
export type ThirdwebTransactionStatus = z.infer<typeof ThirdwebTransactionStatusSchema>;
