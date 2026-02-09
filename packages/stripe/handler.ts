import type { Order, PaymentHandler, WebhookEvent } from "@repo/entities";
import type { StripeClient } from "./client";

export type StripePaymentHandlerConfig = {
  client: StripeClient;
  webhookSecret: string;
};

/**
 * Creates a production-grade Stripe payment handler.
 *
 * Uses the official Stripe SDK for:
 * - Webhook signature verification via `constructEvent`
 * - Checkout session creation
 * - Refund processing
 * - Payment intent status lookup
 */
export function createStripePaymentHandler(
  params: StripePaymentHandlerConfig
): PaymentHandler {
  return {
    async createPaymentSession(order: Order) {
      const lineItems = order.line_items.map((item) => ({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.unit_price,
        },
        quantity: item.quantity,
      }));

      const session = await params.client.createCheckoutSession({
        input: {
          mode: "payment",
          line_items: lineItems,
          success_url: (order.metadata?.success_url as string) ?? "https://example.com/success",
          cancel_url: (order.metadata?.cancel_url as string) ?? "https://example.com/cancel",
          customer_email: order.buyer.email,
          client_reference_id: order.id,
          metadata: {
            order_id: order.id,
          },
        },
      });

      return {
        sessionId: session.id,
        clientSecret: session.client_secret ?? undefined,
        paymentUrl: session.url ?? undefined,
        metadata: {
          orderId: order.id,
          paymentIntent: session.payment_intent,
        },
      };
    },

    async verifyWebhookSignature(body: string, signature: string) {
      if (!signature) {
        return false;
      }

      try {
        // Uses Stripe SDK's built-in signature verification which:
        // 1. Splits the signature header (t=<timestamp>,v1=<sig>)
        // 2. Computes HMAC-SHA256 of `${timestamp}.${body}` with webhook secret
        // 3. Compares using timing-safe equality
        // 4. Validates timestamp tolerance (default 300s)
        params.client.constructWebhookEvent({
          body,
          signature,
          webhookSecret: params.webhookSecret,
        });
        return true;
      } catch {
        return false;
      }
    },

    async processWebhookEvent(event: WebhookEvent) {
      // Map Stripe event types to UCP order states
      const eventType = event.data?.type ?? event.type;

      switch (eventType) {
        case "checkout.session.completed":
          return { status: "confirmed" as const };
        case "payment_intent.succeeded":
          return { status: "confirmed" as const };
        case "payment_intent.payment_failed":
          return { status: "failed" as const };
        case "charge.refunded":
          return { status: "refunded" as const };
        case "charge.dispute.created":
          return { status: "failed" as const };
        case "checkout.session.expired":
          return { status: "canceled" as const };
        default:
          return {};
      }
    },

    async cancelPayment(orderId: string, amount?: number) {
      try {
        const refund = await params.client.createRefund({
          paymentIntentId: orderId,
          amount,
        });

        const statusMap: Record<string, "success" | "pending" | "failed"> = {
          succeeded: "success",
          pending: "pending",
          failed: "failed",
          canceled: "failed",
        };

        return {
          refundId: refund.id,
          status: statusMap[refund.status] ?? "pending",
        };
      } catch {
        return {
          refundId: `stripe_ref_${orderId}`,
          status: "failed" as const,
        };
      }
    },

    async getPaymentStatus(orderId: string) {
      try {
        const intent = await params.client.getPaymentIntent({ id: orderId });

        const statusMap: Record<string, "pending" | "succeeded" | "failed" | "refunded"> = {
          requires_payment_method: "pending",
          requires_confirmation: "pending",
          requires_action: "pending",
          processing: "pending",
          requires_capture: "pending",
          succeeded: "succeeded",
          canceled: "failed",
        };

        return {
          status: statusMap[intent.status] ?? "pending",
          amount: intent.amount,
          currency: intent.currency.toUpperCase(),
        };
      } catch {
        return {
          status: "failed" as const,
          amount: 0,
          currency: "USD",
        };
      }
    },
  };
}
