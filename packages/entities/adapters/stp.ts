/**
 * @deprecated Use `@repo/stp` package instead.
 *
 * The production-grade STP adapter lives in `packages/stp/`.
 * Use `createStpPaymentHandler()` from `@repo/stp` for:
 * - SPEI inbound (cobro) order registration
 * - SPEI outbound (pago/dispersión) transfers
 * - HMAC-SHA256 webhook signature verification
 * - Conciliation queries
 *
 * This stub is kept for reference only.
 */

import type { Order } from "../order.zod";
import type { PaymentHandler } from "../payment-handler";
import type { WebhookEvent } from "../webhook.zod";

export class StpPaymentHandler implements PaymentHandler {
  private empresa: string;
  private clabe: string;

  constructor(empresa: string, clabe: string) {
    this.empresa = empresa;
    this.clabe = clabe;
  }

  async createPaymentSession(order: Order) {
    const claveRastreo = `STP${Date.now()}`;
    return {
      sessionId: claveRastreo,
      metadata: {
        orderId: order.id,
        claveRastreo,
        clabe: this.clabe,
        instructions: {
          description: "Realiza una transferencia SPEI",
          clabe: this.clabe,
          monto: order.totals[0]?.amount || 0,
        },
      },
    };
  }

  async verifyWebhookSignature(_body: string, signature: string) {
    return signature.length > 0;
  }

  async processWebhookEvent(event: WebhookEvent) {
    switch (event.data.estado) {
      case "Liquidada":
        return { status: "confirmed" as const };
      case "Devuelta":
        return { status: "refunded" as const };
      case "Cancelada":
        return { status: "canceled" as const };
      default:
        return {};
    }
  }

  async cancelPayment(orderId: string, _amount?: number) {
    return {
      refundId: `stp_ref_${Date.now()}`,
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
