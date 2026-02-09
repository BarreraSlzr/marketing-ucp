/**
 * @deprecated Use `@repo/mercadopago` package instead.
 *
 * The production-grade MercadoPago adapter lives in `packages/mercadopago/`.
 * Use `createMercadoPagoPaymentHandler()` from `@repo/mercadopago` for:
 * - Checkout Pro preference creation with installments support
 * - HMAC-SHA256 webhook signature verification
 * - Refund processing via MercadoPago Payments API
 * - Payment status queries
 *
 * This stub is kept for reference only.
 */

import type { Order } from "../order.zod";
import type { PaymentHandler } from "../payment-handler";
import type { WebhookEvent } from "../webhook.zod";

export class MercadoPagoPaymentHandler implements PaymentHandler {
  private accessToken: string;
  private webhookSecret: string;

  constructor(accessToken: string, webhookSecret: string) {
    this.accessToken = accessToken;
    this.webhookSecret = webhookSecret;
  }

  async createPaymentSession(order: Order) {
    return {
      sessionId: `pref_${Date.now()}`,
      paymentUrl: `https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref_${Date.now()}`,
      metadata: {
        orderId: order.id,
        amount: order.totals[0]?.amount || 0,
      },
    };
  }

  async verifyWebhookSignature(_body: string, signature: string) {
    return signature.includes("v1=");
  }

  async processWebhookEvent(event: WebhookEvent) {
    switch (event.data.action) {
      case "payment.created":
        return { status: "pending" as const };
      case "payment.updated":
        return { status: "confirmed" as const };
      default:
        return {};
    }
  }

  async cancelPayment(orderId: string, _amount?: number) {
    return {
      refundId: `mp_ref_${Date.now()}`,
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
