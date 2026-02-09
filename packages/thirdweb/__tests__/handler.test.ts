import type { WebhookEvent } from "@repo/entities";
import { describe, expect, test } from "bun:test";
import { createHmac } from "crypto";
import { createThirdwebClient } from "../client";
import { createThirdwebPaymentHandler } from "../handler";

const mockFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.includes("/checkout/create") && init?.method === "POST") {
    return new Response(
      JSON.stringify({
        id: "tw_checkout_456",
        checkout_url: "https://pay.thirdweb.com/checkout/tw_checkout_456",
        status: "created",
      }),
      { status: 200 }
    );
  }

  return new Response("not found", { status: 404 });
};

const WEBHOOK_SECRET = "whsec_test_thirdweb_secret_xyz";

function createHandler() {
  const client = createThirdwebClient({
    secretKey: "test-key",
    fetcher: mockFetch,
  });
  return createThirdwebPaymentHandler({
    client,
    webhookSecret: WEBHOOK_SECRET,
    defaultChainId: 1,
  });
}

function sign(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

describe("createThirdwebPaymentHandler", () => {
  describe("verifyWebhookSignature", () => {
    test("accepts valid HMAC-SHA256 signature", async () => {
      const handler = createHandler();
      const body = '{"type":"payment.confirmed","data":{}}';
      const signature = sign(body);

      expect(await handler.verifyWebhookSignature(body, signature)).toBe(true);
    });

    test("rejects invalid signature", async () => {
      const handler = createHandler();
      const body = '{"type":"payment.confirmed","data":{}}';

      expect(await handler.verifyWebhookSignature(body, "badbadbadbad")).toBe(false);
    });

    test("rejects empty signature", async () => {
      const handler = createHandler();
      expect(await handler.verifyWebhookSignature("{}", "")).toBe(false);
    });

    test("rejects tampered body", async () => {
      const handler = createHandler();
      const body = '{"type":"payment.confirmed","data":{}}';
      const signature = sign(body);
      const tampered = '{"type":"payment.confirmed","data":{"amount":"9999"}}';

      expect(await handler.verifyWebhookSignature(tampered, signature)).toBe(false);
    });
  });

  describe("processWebhookEvent", () => {
    test("maps payment.confirmed to confirmed", async () => {
      const handler = createHandler();
      const event: WebhookEvent = {
        id: "evt_1",
        type: "payment.confirmed",
        timestamp: new Date().toISOString(),
        source: "thirdweb",
        data: {
          transaction_hash: "0xabc",
          wallet_address: "0x1234",
          chain_id: 1,
        },
      };

      const result = await handler.processWebhookEvent(event);
      expect(result.status).toBe("confirmed");
    });

    test("maps payment.failed to failed", async () => {
      const handler = createHandler();
      const event: WebhookEvent = {
        id: "evt_2",
        type: "payment.failed",
        timestamp: new Date().toISOString(),
        source: "thirdweb",
        data: {},
      };

      const result = await handler.processWebhookEvent(event);
      expect(result.status).toBe("failed");
    });

    test("returns empty for unknown event type", async () => {
      const handler = createHandler();
      const event: WebhookEvent = {
        id: "evt_3",
        type: "order.created",
        timestamp: new Date().toISOString(),
        source: "thirdweb",
        data: {},
      };

      const result = await handler.processWebhookEvent(event);
      expect(result.status).toBeUndefined();
    });
  });

  describe("createPaymentSession", () => {
    test("creates session with Thirdweb Pay API", async () => {
      const handler = createHandler();
      const order = {
        id: "ord_123",
        status: "pending" as const,
        buyer: {
          name: "Test Buyer",
          email: "buyer@example.com",
        },
        line_items: [{
          id: "item_1",
          name: "NFT Pass",
          quantity: 1,
          unit_price: 1000000,
          total_price: 1000000,
        }],
        totals: [{ type: "total" as const, amount: 1000000, label: "Total" }],
        payment: { method: "crypto" },
        currency: "USD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          recipientAddress: "0x1234567890abcdef1234567890abcdef12345678",
          tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        },
      };

      const session = await handler.createPaymentSession(order);
      expect(session.sessionId).toBe("tw_checkout_456");
      expect(session.paymentUrl).toContain("thirdweb.com/checkout");
    });

    test("throws when recipientAddress is missing", async () => {
      const handler = createHandler();
      const order = {
        id: "ord_123",
        status: "pending" as const,
        buyer: { name: "Test", email: "test@test.com" },
        line_items: [{ id: "i1", name: "Item", quantity: 1, unit_price: 100, total_price: 100 }],
        totals: [{ type: "total" as const, amount: 100, label: "Total" }],
        payment: { method: "crypto" },
        currency: "USD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      };

      await expect(handler.createPaymentSession(order)).rejects.toThrow(
        "recipientAddress is required"
      );
    });
  });

  describe("cancelPayment", () => {
    test("returns pending status for web3 cancellation", async () => {
      const handler = createHandler();
      const result = await handler.cancelPayment("ord_123");
      expect(result.status).toBe("pending");
      expect(result.refundId).toContain("tw_ref_");
    });
  });
});
