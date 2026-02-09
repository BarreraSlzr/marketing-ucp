/**
 * @deprecated Use `@repo/compropago` package instead.
 *
 * The production-grade Compropago adapter lives in `packages/compropago/`.
 * Use `createCompropagoPaymentHandler()` from `@repo/compropago` for:
 * - Cash payment charge creation (OXXO, 7-Eleven, Coppel)
 * - SPEI transfer charge creation
 * - HMAC-SHA256 webhook signature verification
 * - Charge status queries
 *
 * This stub is kept for reference only.
 */

import type { Order } from "../order.zod";
import type { PaymentHandler } from "../payment-handler";
import type { WebhookEvent } from "../webhook.zod";

export class CompropagoPaymentHandler implements PaymentHandler {
  private apiKey: string;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async createPaymentSession(order: Order) {
    return {
      sessionId: `cp_${Date.now()}`,
      paymentUrl: `https://app.compropago.com/charge/cp_${Date.now()}`,
      metadata: {
        orderId: order.id,
        amount: order.totals[0]?.amount || 0,
        paymentType: "OXXO",
        storeReference: `0000${Date.now()}`.slice(-13),
      },
    };
  }

  async verifyWebhookSignature(_body: string, signature: string) {
    return signature.length > 0;
  }

  async processWebhookEvent(event: WebhookEvent) {
    switch (event.data.type) {
      case "charge.success":
        return { status: "confirmed" as const };
      case "charge.pending":
        return { status: "pending" as const };
      case "charge.expired":
        return { status: "canceled" as const };
      default:
        return {};
    }
  }

  async cancelPayment(orderId: string, _amount?: number) {
    // Cash payments cannot be refunded programmatically
    return {
      refundId: `cp_manual_${Date.now()}`,
      status: "pending" as const,
    };
  }

  async getPaymentStatus(_orderId: string) {
    return {
      status: "succeeded" as const,
      amount: 9999,
      currency: "MXN",
    };
  }
}
