import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import type { PayPalMxClient } from "../client";
import { createPayPalMxPaymentHandler } from "../handler";

function createMockPayPalMxClient(
  overrides?: Partial<PayPalMxClient>
): PayPalMxClient {
  return {
    createOrder: async () => ({
      id: "5O190127TN364715T",
      status: "CREATED" as const,
      links: [
        {
          href: "https://api-m.sandbox.paypal.com/v2/checkout/orders/5O190127TN364715T",
          rel: "self",
          method: "GET",
        },
        {
          href: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
          rel: "approve",
          method: "GET",
        },
      ],
    }),
    captureOrder: async () => ({ status: "COMPLETED" }),
    createRefund: async () => ({
      id: "RF_1234567890",
      status: "COMPLETED" as const,
      amount: { currency_code: "MXN", value: "125.00" },
    }),
    getOrderDetails: async () => ({
      id: "5O190127TN364715T",
      status: "COMPLETED",
      purchase_units: [
        { amount: { value: "125.00", currency_code: "MXN" } },
      ],
    }),
    verifyWebhookSignature: async () => true,
    ...overrides,
  };
}

const WEBHOOK_ID = "WH-TEST-12345";

describe("createPayPalMxPaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("returns true when PayPal verification succeeds", async () => {
      const client = createMockPayPalMxClient();
      const handler = createPayPalMxPaymentHandler({
        client,
        webhookId: WEBHOOK_ID,
      });

      const headers = JSON.stringify({
        "paypal-transmission-id": "abc123",
        "paypal-transmission-time": "2026-01-01T00:00:00Z",
        "paypal-cert-url": "https://example.com/cert",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-transmission-sig": "sig123",
      });

      const result = await handler.verifyWebhookSignature(
        '{"event_type":"PAYMENT.CAPTURE.COMPLETED"}',
        headers
      );
      expect(result).toBe(true);
    });

    test("returns false when verification fails", async () => {
      const client = createMockPayPalMxClient({
        verifyWebhookSignature: async () => false,
      });
      const handler = createPayPalMxPaymentHandler({
        client,
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.verifyWebhookSignature("{}", "{}");
      expect(result).toBe(false);
    });

    test("returns false for empty signature", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.verifyWebhookSignature("{}", "");
      expect(result).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    const makeEvent = (eventType: string): WebhookEvent => ({
      id: "evt_1",
      type: "payment.confirmed" as WebhookEvent["type"],
      timestamp: new Date().toISOString(),
      source: "paypal-mx",
      data: { event_type: eventType },
    });

    test("maps CHECKOUT.ORDER.APPROVED → confirmed", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("CHECKOUT.ORDER.APPROVED")
      );
      expect(result.status).toBe("confirmed");
    });

    test("maps PAYMENT.CAPTURE.COMPLETED → confirmed", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("PAYMENT.CAPTURE.COMPLETED")
      );
      expect(result.status).toBe("confirmed");
    });

    test("maps PAYMENT.CAPTURE.DENIED → failed", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("PAYMENT.CAPTURE.DENIED")
      );
      expect(result.status).toBe("failed");
    });

    test("maps PAYMENT.CAPTURE.REFUNDED → refunded", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("PAYMENT.CAPTURE.REFUNDED")
      );
      expect(result.status).toBe("refunded");
    });

    test("returns empty for unknown event type", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("VAULT.CREDIT-CARD.CREATED")
      );
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("creates PayPal order and returns approve URL", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });

      const order = {
        id: "ord_mx_123",
        status: "pending" as const,
        buyer: { name: "Juan Pérez", email: "juan@example.com" },
        line_items: [
          {
            id: "item_1",
            name: "Producto MX",
            quantity: 1,
            unit_price: 12500,
            total_price: 12500,
          },
        ],
        totals: [{ type: "total" as const, amount: 12500, label: "Total" }],
        payment: { method: "paypal" },
        currency: "MXN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("5O190127TN364715T");
      expect(session.paymentUrl).toContain("sandbox.paypal.com");
    });
  });

  describe("cancelPayment", () => {
    test("creates refund via PayPal API", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.cancelPayment("capture_123", 5000);
      expect(result.refundId).toBe("RF_1234567890");
      expect(result.status).toBe("success");
    });

    test("returns failed on refund error", async () => {
      const client = createMockPayPalMxClient({
        createRefund: async () => {
          throw new Error("Refund failed");
        },
      });
      const handler = createPayPalMxPaymentHandler({
        client,
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.cancelPayment("bad_capture");
      expect(result.status).toBe("failed");
    });
  });

  describe("getPaymentStatus", () => {
    test("retrieves order status", async () => {
      const handler = createPayPalMxPaymentHandler({
        client: createMockPayPalMxClient(),
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.getPaymentStatus("5O190127TN364715T");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(12500);
      expect(result.currency).toBe("MXN");
    });

    test("returns failed on error", async () => {
      const client = createMockPayPalMxClient({
        getOrderDetails: async () => {
          throw new Error("Not found");
        },
      });
      const handler = createPayPalMxPaymentHandler({
        client,
        webhookId: WEBHOOK_ID,
      });

      const result = await handler.getPaymentStatus("bad_id");
      expect(result.status).toBe("failed");
    });
  });
});
