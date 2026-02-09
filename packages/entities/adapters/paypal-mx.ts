/**
 * @deprecated Use `@repo/paypal-mx` package instead.
 *
 * The production-grade PayPal MX adapter lives in `packages/paypal-mx/`.
 * Use `createPayPalMxPaymentHandler()` from `@repo/paypal-mx` for:
 * - PayPal Orders API v2 checkout session creation
 * - PayPal webhook signature verification via Notifications API
 * - Refund processing via PayPal Payments API
 * - Order status queries
 *
 * This stub is kept for reference only.
 */

import type { Order } from "../order.zod";
import type { PaymentHandler } from "../payment-handler";
import type { WebhookEvent } from "../webhook.zod";

export class PayPalMxPaymentHandler implements PaymentHandler {
  private clientId: string;
  private webhookId: string;

  constructor(clientId: string, webhookId: string) {
    this.clientId = clientId;
    this.webhookId = webhookId;
  }

  async createPaymentSession(order: Order) {
    return {
      sessionId: `pp_${Date.now()}`,
      paymentUrl: `https://www.sandbox.paypal.com/checkoutnow?token=pp_${Date.now()}`,
      metadata: {
        orderId: order.id,
        amount: order.totals[0]?.amount || 0,
      },
    };
  }

  async verifyWebhookSignature(_body: string, signature: string) {
    return signature.length > 0;
  }

  async processWebhookEvent(event: WebhookEvent) {
    switch (event.data.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        return { status: "confirmed" as const };
      case "PAYMENT.CAPTURE.COMPLETED":
        return { status: "confirmed" as const };
      case "PAYMENT.CAPTURE.REFUNDED":
        return { status: "refunded" as const };
      default:
        return {};
    }
  }

  async cancelPayment(orderId: string, _amount?: number) {
    return {
      refundId: `pp_ref_${Date.now()}`,
      status: "success" as const,
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
