import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import type { MercadoPagoClient } from "../client";
import { createMercadoPagoPaymentHandler } from "../handler";

function createMockMercadoPagoClient(
  overrides?: Partial<MercadoPagoClient>
): MercadoPagoClient {
  return {
    createPreference: async () => ({
      id: "pref_123456789",
      init_point:
        "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref_123456789",
      sandbox_init_point:
        "https://sandbox.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref_123456789",
      external_reference: "ord_mx_123",
    }),
    getPayment: async () => ({
      id: 12345678,
      status: "approved" as const,
      status_detail: "accredited",
      transaction_amount: 125.0,
      currency_id: "MXN",
      installments: 3,
      external_reference: "ord_mx_123",
      payment_method_id: "visa",
      payment_type_id: "credit_card",
    }),
    createRefund: async () => ({
      id: 87654321,
      payment_id: 12345678,
      amount: 125.0,
      status: "approved" as const,
      date_created: new Date().toISOString(),
    }),
    verifyWebhookSignature: () => true,
    ...overrides,
  };
}

const WEBHOOK_SECRET = "mp_webhook_secret_abc";

describe("createMercadoPagoPaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("returns true when HMAC verification succeeds", async () => {
      const client = createMockMercadoPagoClient();
      const handler = createMercadoPagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const sigData = JSON.stringify({
        xSignature: "ts=1234,v1=abc123",
        xRequestId: "req-uuid",
        dataId: "12345678",
      });

      const result = await handler.verifyWebhookSignature("{}", sigData);
      expect(result).toBe(true);
    });

    test("returns false when verification fails", async () => {
      const client = createMockMercadoPagoClient({
        verifyWebhookSignature: () => false,
      });
      const handler = createMercadoPagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const sigData = JSON.stringify({
        xSignature: "bad",
        xRequestId: "req",
        dataId: "1",
      });

      const result = await handler.verifyWebhookSignature("{}", sigData);
      expect(result).toBe(false);
    });

    test("returns false for empty signature", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const result = await handler.verifyWebhookSignature("{}", "");
      expect(result).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    const makeEvent = (action: string): WebhookEvent => ({
      id: "evt_1",
      type: "payment.confirmed" as WebhookEvent["type"],
      timestamp: new Date().toISOString(),
      source: "mercadopago",
      data: { action },
    });

    test("maps payment.created → pending", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });
      const result = await handler.processWebhookEvent(
        makeEvent("payment.created")
      );
      expect(result.status).toBe("pending");
    });

    test("maps payment.updated → confirmed", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });
      const result = await handler.processWebhookEvent(
        makeEvent("payment.updated")
      );
      expect(result.status).toBe("confirmed");
    });

    test("maps payment.refunded → refunded", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });
      const result = await handler.processWebhookEvent(
        makeEvent("payment.refunded")
      );
      expect(result.status).toBe("refunded");
    });

    test("maps chargebacks → failed", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });
      const result = await handler.processWebhookEvent(
        makeEvent("chargebacks")
      );
      expect(result.status).toBe("failed");
    });

    test("returns empty for unknown action", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });
      const result = await handler.processWebhookEvent(
        makeEvent("unknown.event")
      );
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("creates preference and returns sandbox URL in sandbox mode", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const order = {
        id: "ord_mx_123",
        status: "pending" as const,
        buyer: { name: "María López", email: "maria@example.com" },
        line_items: [
          {
            id: "item_1",
            name: "Producto MX",
            quantity: 2,
            unit_price: 6250,
            total_price: 12500,
          },
        ],
        totals: [{ type: "total" as const, amount: 12500, label: "Total" }],
        payment: { method: "card" },
        currency: "MXN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("pref_123456789");
      expect(session.paymentUrl).toContain("sandbox.mercadopago");
    });

    test("uses production init_point in production mode", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "production",
      });

      const order = {
        id: "ord_mx_456",
        status: "pending" as const,
        buyer: { name: "Carlos", email: "carlos@example.com" },
        line_items: [
          {
            id: "item_1",
            name: "Widget",
            quantity: 1,
            unit_price: 5000,
            total_price: 5000,
          },
        ],
        totals: [{ type: "total" as const, amount: 5000, label: "Total" }],
        payment: { method: "card" },
        currency: "MXN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.paymentUrl).toContain("www.mercadopago");
    });
  });

  describe("cancelPayment", () => {
    test("creates refund via MercadoPago API", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const result = await handler.cancelPayment("12345678", 5000);
      expect(result.refundId).toBe("87654321");
      expect(result.status).toBe("success");
    });

    test("returns failed on refund error", async () => {
      const client = createMockMercadoPagoClient({
        createRefund: async () => {
          throw new Error("Refund failed");
        },
      });
      const handler = createMercadoPagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const result = await handler.cancelPayment("bad_id");
      expect(result.status).toBe("failed");
    });
  });

  describe("getPaymentStatus", () => {
    test("retrieves payment status with installments", async () => {
      const handler = createMercadoPagoPaymentHandler({
        client: createMockMercadoPagoClient(),
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const result = await handler.getPaymentStatus("12345678");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(12500);
      expect(result.currency).toBe("MXN");
    });

    test("returns failed on error", async () => {
      const client = createMockMercadoPagoClient({
        getPayment: async () => {
          throw new Error("Not found");
        },
      });
      const handler = createMercadoPagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        environment: "sandbox",
      });

      const result = await handler.getPaymentStatus("bad_id");
      expect(result.status).toBe("failed");
    });
  });
});
