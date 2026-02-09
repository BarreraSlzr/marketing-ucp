import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import type { CompropagoClient } from "../client";
import { createCompropagoPaymentHandler } from "../handler";

function createMockCompropagoClient(
  overrides?: Partial<CompropagoClient>
): CompropagoClient {
  return {
    createCharge: async () => ({
      id: "cp_ch_12345",
      short_id: "CP12345",
      status: "charge.pending" as const,
      order_info: {
        order_id: "ord_mx_123",
        order_name: "Producto MX",
        order_price: 125.0,
      },
      payment_info: {
        payment_type: "OXXO",
        store_reference: "0000012345678",
        barcode_url: "https://app.compropago.com/barcode/cp_ch_12345",
      },
      instructions: {
        description: "Acude a tu OXXO más cercano",
        step_1: "Indica que quieres hacer un pago de servicios",
        step_2: "Proporciona el código de barras",
        step_3: "Realiza el pago en efectivo",
      },
      expires_at: "2026-02-10T00:00:00Z",
    }),
    getCharge: async () => ({
      id: "cp_ch_12345",
      status: "charge.success" as const,
      order_info: {
        order_id: "ord_mx_123",
        order_name: "Producto MX",
        order_price: 125.0,
      },
    }),
    verifyWebhookSignature: () => true,
    ...overrides,
  };
}

const WEBHOOK_SECRET = "cp_webhook_secret_abc";

describe("createCompropagoPaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("returns true when HMAC verification succeeds", async () => {
      const client = createMockCompropagoClient();
      const handler = createCompropagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature(
        '{"type":"charge.success"}',
        "valid_hmac_signature"
      );
      expect(result).toBe(true);
    });

    test("returns false when verification fails", async () => {
      const client = createMockCompropagoClient({
        verifyWebhookSignature: () => false,
      });
      const handler = createCompropagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature("{}", "bad");
      expect(result).toBe(false);
    });

    test("returns false for empty signature", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.verifyWebhookSignature("{}", "");
      expect(result).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    const makeEvent = (type: string): WebhookEvent => ({
      id: "evt_1",
      type: "payment.confirmed" as WebhookEvent["type"],
      timestamp: new Date().toISOString(),
      source: "compropago",
      data: { type },
    });

    test("maps charge.pending → pending", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("charge.pending")
      );
      expect(result.status).toBe("pending");
    });

    test("maps charge.success → confirmed", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("charge.success")
      );
      expect(result.status).toBe("confirmed");
    });

    test("maps charge.expired → canceled", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("charge.expired")
      );
      expect(result.status).toBe("canceled");
    });

    test("maps charge.declined → failed", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("charge.declined")
      );
      expect(result.status).toBe("failed");
    });

    test("returns empty for unknown event type", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("unknown.event")
      );
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("creates cash charge and returns barcode URL", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const order = {
        id: "ord_mx_123",
        status: "pending" as const,
        buyer: { name: "Pedro García", email: "pedro@example.com" },
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
        payment: { method: "cash" },
        currency: "MXN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("cp_ch_12345");
      expect(session.paymentUrl).toContain("compropago.com");
      expect(session.metadata?.storeReference).toBe("0000012345678");
    });
  });

  describe("cancelPayment", () => {
    test("returns pending for cash payments (manual refund required)", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.cancelPayment("cp_ch_12345");
      expect(result.status).toBe("pending");
      expect(result.refundId).toContain("cp_manual_");
    });
  });

  describe("getPaymentStatus", () => {
    test("retrieves charge status", async () => {
      const handler = createCompropagoPaymentHandler({
        client: createMockCompropagoClient(),
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.getPaymentStatus("cp_ch_12345");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(12500);
      expect(result.currency).toBe("MXN");
    });

    test("returns failed on error", async () => {
      const client = createMockCompropagoClient({
        getCharge: async () => {
          throw new Error("Not found");
        },
      });
      const handler = createCompropagoPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
      });

      const result = await handler.getPaymentStatus("bad_id");
      expect(result.status).toBe("failed");
    });
  });
});
