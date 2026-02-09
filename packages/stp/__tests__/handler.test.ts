import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import type { StpClient } from "../client";
import { createStpPaymentHandler } from "../handler";

function createMockStpClient(
  overrides?: Partial<StpClient>
): StpClient {
  return {
    registerSpeiIn: async () => ({
      id: 987654321,
      claveRastreo: "STP20260208001",
      estado: "En proceso",
      monto: 125.0,
      fechaOperacion: "20260208",
    }),
    sendSpeiOut: async () => ({
      id: 123456789,
      claveRastreo: "STP20260208002",
      estado: "Liquidada",
      monto: 125.0,
      fechaOperacion: "20260208",
    }),
    getConciliation: async () => [
      {
        id: 987654321,
        claveRastreo: "STP20260208001",
        cuentaBeneficiario: "012345678901234567",
        monto: 125.0,
        conceptoPago: "Producto MX",
        estado: "Liquidada",
        fechaOperacion: "20260208",
      },
    ],
    getOrderStatus: async () => ({
      id: 987654321,
      claveRastreo: "STP20260208001",
      estado: "Liquidada",
      monto: 125.0,
      fechaOperacion: "20260208",
    }),
    verifyWebhookSignature: () => true,
    ...overrides,
  };
}

const WEBHOOK_SECRET = "stp_webhook_secret_abc";
const EMPRESA = "MIEMPRESA";
const CLABE = "012345678901234567";

describe("createStpPaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("returns true when HMAC verification succeeds", async () => {
      const client = createMockStpClient();
      const handler = createStpPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.verifyWebhookSignature(
        '{"estado":"Liquidada"}',
        "valid_hmac"
      );
      expect(result).toBe(true);
    });

    test("returns false when verification fails", async () => {
      const client = createMockStpClient({
        verifyWebhookSignature: () => false,
      });
      const handler = createStpPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.verifyWebhookSignature("{}", "bad");
      expect(result).toBe(false);
    });

    test("returns false for empty signature", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.verifyWebhookSignature("{}", "");
      expect(result).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    const makeEvent = (estado: string): WebhookEvent => ({
      id: "evt_1",
      type: "payment.confirmed" as WebhookEvent["type"],
      timestamp: new Date().toISOString(),
      source: "stp",
      data: { estado },
    });

    test("maps Liquidada → confirmed", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("Liquidada")
      );
      expect(result.status).toBe("confirmed");
    });

    test("maps Devuelta → refunded", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("Devuelta")
      );
      expect(result.status).toBe("refunded");
    });

    test("maps En proceso → pending", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("En proceso")
      );
      expect(result.status).toBe("pending");
    });

    test("maps Cancelada → canceled", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("Cancelada")
      );
      expect(result.status).toBe("canceled");
    });

    test("returns empty for unknown estado", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });
      const result = await handler.processWebhookEvent(
        makeEvent("Desconocido")
      );
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("registers SPEI in order and returns CLABE instructions", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const order = {
        id: "ord_mx_123",
        status: "pending" as const,
        buyer: { name: "Ana Martínez", email: "ana@example.com" },
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
        payment: { method: "spei" },
        currency: "MXN",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("STP20260208001");
      expect(session.metadata?.clabe).toBe(CLABE);
      expect(session.metadata?.claveRastreo).toBe("STP20260208001");
      expect((session.metadata?.instructions as Record<string, unknown>)?.clabe).toBe(CLABE);
    });
  });

  describe("cancelPayment", () => {
    test("sends SPEI out as refund", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.cancelPayment("012345678901234567", 12500);
      expect(result.refundId).toBe("STP20260208002");
      expect(result.status).toBe("success");
    });

    test("returns pending on error", async () => {
      const client = createMockStpClient({
        sendSpeiOut: async () => {
          throw new Error("STP error");
        },
      });
      const handler = createStpPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.cancelPayment("bad_clabe", 5000);
      expect(result.status).toBe("pending");
    });
  });

  describe("getPaymentStatus", () => {
    test("retrieves SPEI order status", async () => {
      const handler = createStpPaymentHandler({
        client: createMockStpClient(),
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.getPaymentStatus("STP20260208001");
      expect(result.status).toBe("succeeded");
      expect(result.amount).toBe(12500);
      expect(result.currency).toBe("MXN");
    });

    test("returns failed on error", async () => {
      const client = createMockStpClient({
        getOrderStatus: async () => {
          throw new Error("Not found");
        },
      });
      const handler = createStpPaymentHandler({
        client,
        webhookSecret: WEBHOOK_SECRET,
        empresa: EMPRESA,
        clabe: CLABE,
      });

      const result = await handler.getPaymentStatus("bad_clave");
      expect(result.status).toBe("failed");
    });
  });
});
