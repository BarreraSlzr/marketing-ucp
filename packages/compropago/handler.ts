import type { Order, PaymentHandler, WebhookEvent } from "@repo/entities";
import type { CompropagoClient } from "./client";

export type CompropagoPaymentHandlerConfig = {
  client: CompropagoClient;
  webhookSecret: string;
};

/**
 * Creates a production-grade Compropago payment handler.
 *
 * Compropago, S.A. de C.V. (IFPE-regulated)
 *
 * Supports:
 * - Cash payments at convenience stores (OXXO, 7-Eleven, Coppel)
 * - SPEI bank transfers
 * - Webhook HMAC-SHA256 signature verification
 * - Charge status lookup
 *
 * Note: Compropago does not support refunds via API — refunds
 * are processed manually or via SPEI reversal.
 */
export function createCompropagoPaymentHandler(
  params: CompropagoPaymentHandlerConfig
): PaymentHandler {
  return {
    async createPaymentSession(order: Order) {
      const totalAmount = order.totals.find((t) => t.type === "grand_total");
      const amountValue = totalAmount
        ? totalAmount.amount / 100
        : 0;

      const charge = await params.client.createCharge({
        input: {
          order_id: order.id,
          order_name: order.line_items.map((i) => i.name).join(", "),
          order_price: amountValue,
          customer_name: `${order.buyer.first_name ?? ""} ${order.buyer.last_name ?? ""}`.trim(),
          customer_email: order.buyer.email,
          payment_type: (order.metadata?.payment_type as string) ?? "OXXO",
          currency: order.currency.toUpperCase() === "MXN" ? "MXN" : order.currency,
          success_url: order.metadata?.success_url as string,
        },
      });

      return {
        sessionId: charge.id,
        paymentUrl: charge.payment_info?.barcode_url,
        metadata: {
          orderId: order.id,
          chargeId: charge.id,
          status: charge.status,
          storeReference: charge.payment_info?.store_reference,
          paymentType: charge.payment_info?.payment_type,
          instructions: charge.instructions,
          expiresAt: charge.expires_at,
        },
      };
    },

    async verifyWebhookSignature(body: string, signature: string) {
      if (!signature) {
        return false;
      }

      return params.client.verifyWebhookSignature({
        body,
        signature,
        secret: params.webhookSecret,
      });
    },

    async processWebhookEvent(event: WebhookEvent) {
      const eventType = (event.data?.type as string) ?? event.type;

      switch (eventType) {
        case "charge.pending":
          return { status: "pending" as const };
        case "charge.success":
          return { status: "confirmed" as const };
        case "charge.expired":
          return { status: "canceled" as const };
        case "charge.declined":
          return { status: "failed" as const };
        default:
          return {};
      }
    },

    async cancelPayment(orderId: string, _amount?: number) {
      // Compropago does not support API-based refunds.
      // Cash payments cannot be reversed programmatically.
      // Return pending to indicate manual processing is required.
      return {
        refundId: `cp_manual_${orderId}`,
        status: "pending" as const,
      };
    },

    async getPaymentStatus(orderId: string) {
      try {
        const charge = await params.client.getCharge({
          chargeId: orderId,
        });

        const statusMap: Record<
          string,
          "pending" | "succeeded" | "failed" | "refunded"
        > = {
          "charge.pending": "pending",
          "charge.success": "succeeded",
          "charge.expired": "failed",
          "charge.declined": "failed",
        };

        return {
          status: statusMap[charge.status] ?? "pending",
          amount: Math.round(charge.order_info.order_price * 100),
          currency: "MXN",
        };
      } catch {
        return {
          status: "failed" as const,
          amount: 0,
          currency: "MXN",
        };
      }
    },
  };
}
