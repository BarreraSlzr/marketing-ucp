import type { Order, PaymentHandler, WebhookEvent } from "@repo/entities";
import { createHmac, timingSafeEqual } from "crypto";
import type { PolarClient } from "./client";
import { PolarCheckoutInputSchema } from "./schemas";

export type PolarPaymentHandlerConfig = {
  client: PolarClient;
  webhookSecret: string;
};

function toHexSignature(params: { secret: string; body: string }): string {
  return createHmac("sha256", params.secret).update(params.body).digest("hex");
}

export function createPolarPaymentHandler(
  params: PolarPaymentHandlerConfig
): PaymentHandler {
  return {
    async createPaymentSession(order: Order) {
      const line_items = order.line_items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const input = PolarCheckoutInputSchema.parse({
        order_id: order.id,
        currency: order.currency,
        line_items,
        success_url: order.metadata?.success_url ?? "https://example.com/success",
        cancel_url: order.metadata?.cancel_url ?? "https://example.com/cancel",
        customer_email: order.buyer.email,
        metadata: order.metadata,
      });

      const session = await params.client.createCheckoutSession({ input });
      return {
        sessionId: session.id,
        paymentUrl: session.url,
        metadata: {
          orderId: order.id,
        },
      };
    },

    async verifyWebhookSignature(body: string, signature: string) {
      if (!signature) {
        return false;
      }

      const expected = toHexSignature({
        secret: params.webhookSecret,
        body,
      });

      const expectedBuffer = Buffer.from(expected, "hex");
      const providedBuffer = Buffer.from(signature, "hex");

      if (expectedBuffer.length !== providedBuffer.length) {
        return false;
      }

      return timingSafeEqual(expectedBuffer, providedBuffer);
    },

    async processWebhookEvent(event: WebhookEvent) {
      switch (event.type) {
        case "order.created":
          return { status: "pending" as const };
        case "payment.confirmed":
          return { status: "confirmed" as const };
        case "order.refunded":
          return { status: "refunded" as const };
        default:
          return {};
      }
    },

    async cancelPayment(orderId: string) {
      return {
        refundId: `polar_ref_${orderId}`,
        status: "pending" as const,
      };
    },

    async getPaymentStatus() {
      return {
        status: "pending" as const,
        amount: 0,
        currency: "USD",
      };
    },
  };
}
