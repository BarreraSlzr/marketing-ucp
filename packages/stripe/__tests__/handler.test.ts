import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import type { StripeClient } from "../client";
import { createStripePaymentHandler } from "../handler";

function createMockStripeClient(overrides?: Partial<StripeClient>): StripeClient {
  return {
    createCheckoutSession: async () => ({
      id: "cs_test_session_123",
      url: "https://checkout.stripe.com/pay/cs_test_session_123",
      status: "open" as const,
      payment_status: "unpaid" as const,
      payment_intent: "pi_test_123",
      client_secret: "cs_secret_abc",
    }),
    createRefund: async () => ({
      id: "re_test_refund_123",
      status: "succeeded" as const,
      amount: 2500,
      currency: "usd",
      payment_intent: "pi_test_123",
    }),
    getPaymentIntent: async () => ({
      id: "pi_test_123",
      status: "succeeded" as const,
      amount: 2500,
      currency: "usd",
    }),
    constructWebhookEvent: () => {
      // Default: verification succeeds
      return { id: "evt_1", type: "checkout.session.completed" } as never;
    },
    ...overrides,
  };
}

const WEBHOOK_SECRET = "whsec_test_stripe_secret_abc";

describe("createStripePaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("returns true when constructWebhookEvent succeeds", async () => {
      const client = createMockStripeClient();
      const handler = createStripePaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature(
        '{"type":"checkout.session.completed"}',
        "t=1234,v1=abc123"
      );
      expect(result).toBe(true);
    });

    test("returns false when constructWebhookEvent throws", async () => {
      const client = createMockStripeClient({
        constructWebhookEvent: () => {
          throw new Error("Invalid signature");
        },
      });
      const handler = createStripePaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature("{}", "invalid");
      expect(result).toBe(false);
    });

    test("returns false for empty signature", async () => {
      const client = createMockStripeClient();
      const handler = createStripePaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature("{}", "");
      expect(result).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    const makeEvent = (type: string): WebhookEvent => ({
      id: "evt_1",
      type: type as WebhookEvent["type"],
      timestamp: new Date().toISOString(),
      source: "stripe",
      data: { type },
    });

    test("maps checkout.session.completed → confirmed", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(makeEvent("checkout.session.completed"));
      expect(result.status).toBe("confirmed");
    });

    test("maps charge.refunded → refunded", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(makeEvent("charge.refunded"));
      expect(result.status).toBe("refunded");
    });

    test("maps charge.dispute.created → failed", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(makeEvent("charge.dispute.created"));
      expect(result.status).toBe("failed");
    });

    test("maps checkout.session.expired → canceled", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(makeEvent("checkout.session.expired"));
      expect(result.status).toBe("canceled");
    });

    test("returns empty for unknown event type", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(makeEvent("customer.created"));
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("creates checkout session via Stripe client", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const order = {
        id: "ord_123",
        status: "pending" as const,
        buyer: { name: "Test Buyer", email: "buyer@example.com" },
        line_items: [{
          id: "item_1",
          name: "Widget",
          quantity: 2,
          unit_price: 1250,
          total_price: 2500,
        }],
        totals: [{ type: "total" as const, amount: 2500, label: "Total" }],
        payment: { method: "card" },
        currency: "USD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("cs_test_session_123");
      expect(session.paymentUrl).toContain("checkout.stripe.com");
      expect(session.clientSecret).toBe("cs_secret_abc");
    });
  });

  describe("cancelPayment", () => {
    test("creates refund via Stripe API", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.cancelPayment("pi_test_123", 1000);
      expect(result.refundId).toBe("re_test_refund_123");
      expect(result.status).toBe("success");
    });

    test("returns failed on refund error", async () => {
      const client = createMockStripeClient({
        createRefund: async () => {
          throw new Error("Refund failed");
        },
      });
      const handler = createStripePaymentHandler({ client, webhookSecret: WEBHOOK_SECRET });

      const result = await handler.cancelPayment("pi_bad");
      expect(result.status).toBe("failed");
    });
  });

  describe("getPaymentStatus", () => {
    test("retrieves payment intent status", async () => {
      const handler = createStripePaymentHandler({
        client: createMockStripeClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.getPaymentStatus("pi_test_123");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(2500);
      expect(result.currency).toBe("USD");
    });

    test("returns failed on error", async () => {
      const client = createMockStripeClient({
        getPaymentIntent: async () => {
          throw new Error("Not found");
        },
      });
      const handler = createStripePaymentHandler({ client, webhookSecret: WEBHOOK_SECRET });

      const result = await handler.getPaymentStatus("pi_bad");
      expect(result.status).toBe("failed");
    });
  });
});
