/**
 * @deprecated Use `@repo/stripe` package instead.
 *
 * The production-grade Stripe adapter lives in `packages/stripe/`.
 * Use `createStripePaymentHandler()` from `@repo/stripe` for:
 * - Real Stripe SDK webhook signature verification
 * - Stripe Checkout session creation
 * - Refund processing via Stripe API
 * - Payment intent status queries
 *
 * This stub is kept for reference only.
 */

import type { Order } from "../order.zod";
import type { PaymentHandler } from "../payment-handler";
import type { WebhookEvent } from "../webhook.zod";
export class StripePaymentHandler implements PaymentHandler {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async createPaymentSession(order: Order) {
    // In a real implementation, call Stripe API
    // POST https://api.stripe.com/v1/checkout/sessions
    return {
      sessionId: `pi_${Date.now()}`,
      clientSecret: `secret_${Math.random().toString(36).slice(2)}`,
      paymentUrl: `https://checkout.stripe.com/pay/cs_test_${Date.now()}`,
      metadata: {
        orderId: order.id,
        amount: order.totals[0]?.amount || 0,
      },
    };
  }

  async verifyWebhookSignature(body: string, signature: string) {
    // In a real implementation, use Stripe's signature verification
    // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    // For now, return true for demo purposes
    return signature.startsWith("t=");
  }

  async processWebhookEvent(event: WebhookEvent) {
    // Map Stripe webhook events to UCP order states
    switch (event.data.type) {
      case "checkout.session.completed":
        return { status: "confirmed" as const };
      case "charge.refunded":
        return { status: "refunded" as const };
      case "charge.dispute.created":
        return { status: "failed" as const };
      default:
        return {};
    }
  }

  async cancelPayment(orderId: string, amount?: number) {
    // POST https://api.stripe.com/v1/refunds
    return {
      refundId: `re_${Date.now()}`,
      status: "success" as const,
    };
  }

  async getPaymentStatus(orderId: string) {
    // GET https://api.stripe.com/v1/payment_intents/{orderId}
    return {
      status: "succeeded" as const,
      amount: 9999,
      currency: "USD",
    };
  }
}
