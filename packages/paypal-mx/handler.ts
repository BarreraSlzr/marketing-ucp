import type { Order, PaymentHandler, WebhookEvent } from "@repo/entities";
import type { PayPalMxClient } from "./client";

export type PayPalMxPaymentHandlerConfig = {
  client: PayPalMxClient;
  webhookId: string;
};

/**
 * Creates a production-grade PayPal México payment handler.
 *
 * PayPal Payments México, S.A.P.I. de C.V. (IFPE-regulated)
 *
 * Supports:
 * - Checkout session (order) creation via PayPal Orders API v2
 * - Webhook signature verification via PayPal Notifications API
 * - Refund processing via PayPal Payments API
 * - Order status lookup
 */
export function createPayPalMxPaymentHandler(
  params: PayPalMxPaymentHandlerConfig
): PaymentHandler {
  return {
    async createPaymentSession(order: Order) {
      const totalAmount = order.totals.find((t) => t.type === "grand_total");
      const amountValue = totalAmount
        ? (totalAmount.amount / 100).toFixed(2)
        : "0.00";

      const paypalOrder = await params.client.createOrder({
        input: {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: order.id,
              description: order.line_items.map((i) => i.name).join(", "),
              amount: {
                currency_code: order.currency.toUpperCase() === "MXN" ? "MXN" : order.currency,
                value: amountValue,
                breakdown: {
                  item_total: {
                    currency_code: order.currency.toUpperCase() === "MXN" ? "MXN" : order.currency,
                    value: amountValue,
                  },
                },
              },
              items: order.line_items.map((item) => ({
                name: item.name,
                description: item.description,
                unit_amount: {
                  currency_code: order.currency.toUpperCase() === "MXN" ? "MXN" : order.currency,
                  value: (item.unit_price / 100).toFixed(2),
                },
                quantity: String(item.quantity),
              })),
            },
          ],
          application_context: {
            return_url:
              (order.metadata?.success_url as string) ??
              "https://example.com/success",
            cancel_url:
              (order.metadata?.cancel_url as string) ??
              "https://example.com/cancel",
            locale: "es-MX",
            user_action: "PAY_NOW",
          },
        },
      });

      const approveLink = paypalOrder.links.find((l) => l.rel === "approve");

      return {
        sessionId: paypalOrder.id,
        paymentUrl: approveLink?.href,
        metadata: {
          orderId: order.id,
          paypalOrderId: paypalOrder.id,
          status: paypalOrder.status,
        },
      };
    },

    async verifyWebhookSignature(body: string, signature: string) {
      if (!signature) {
        return false;
      }

      try {
        // PayPal sends verification headers as a composite signature string.
        // In production the raw headers must be forwarded.
        // For this handler, the signature param encodes the JSON-stringified headers.
        const headers: Record<string, string> = JSON.parse(signature);
        return await params.client.verifyWebhookSignature({
          webhookId: params.webhookId,
          headers,
          body,
        });
      } catch {
        return false;
      }
    },

    async processWebhookEvent(event: WebhookEvent) {
      const eventType = (event.data?.event_type as string) ?? event.type;

      switch (eventType) {
        case "CHECKOUT.ORDER.APPROVED":
          return { status: "confirmed" as const };
        case "PAYMENT.CAPTURE.COMPLETED":
          return { status: "confirmed" as const };
        case "PAYMENT.CAPTURE.DENIED":
          return { status: "failed" as const };
        case "PAYMENT.CAPTURE.REFUNDED":
          return { status: "refunded" as const };
        case "CHECKOUT.ORDER.COMPLETED":
          return { status: "confirmed" as const };
        case "CUSTOMER.DISPUTE.CREATED":
          return { status: "failed" as const };
        default:
          return {};
      }
    },

    async cancelPayment(orderId: string, amount?: number) {
      try {
        const refundAmount = amount
          ? { currency_code: "MXN", value: (amount / 100).toFixed(2) }
          : undefined;

        const refund = await params.client.createRefund({
          captureId: orderId,
          amount: refundAmount,
        });

        const statusMap: Record<string, "success" | "pending" | "failed"> = {
          COMPLETED: "success",
          PENDING: "pending",
          CANCELLED: "failed",
        };

        return {
          refundId: refund.id,
          status: statusMap[refund.status] ?? "pending",
        };
      } catch {
        return {
          refundId: `pp_ref_${orderId}`,
          status: "failed" as const,
        };
      }
    },

    async getPaymentStatus(orderId: string) {
      try {
        const details = await params.client.getOrderDetails({
          orderId,
        });

        const status = details.status as string;
        const statusMap: Record<
          string,
          "pending" | "succeeded" | "failed" | "refunded"
        > = {
          CREATED: "pending",
          SAVED: "pending",
          APPROVED: "pending",
          COMPLETED: "succeeded",
          VOIDED: "failed",
          PAYER_ACTION_REQUIRED: "pending",
        };

        const purchaseUnit = (
          details.purchase_units as Array<{
            amount: { value: string; currency_code: string };
          }>
        )?.[0];

        return {
          status: statusMap[status] ?? "pending",
          amount: purchaseUnit
            ? Math.round(parseFloat(purchaseUnit.amount.value) * 100)
            : 0,
          currency: purchaseUnit?.amount.currency_code ?? "MXN",
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
