import { describe, expect, test } from "bun:test";
import { createThirdwebClient } from "../client";

const mockFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.includes("/checkout/create") && init?.method === "POST") {
    return new Response(
      JSON.stringify({
        id: "tw_checkout_123",
        checkout_url: "https://pay.thirdweb.com/checkout/tw_checkout_123",
        status: "created",
      }),
      { status: 200 }
    );
  }

  if (url.includes("/transaction/status") && init?.method === "GET") {
    return new Response(
      JSON.stringify({
        transaction_hash: "0xabc123",
        status: "confirmed",
        chain_id: 1,
        amount: "1000000",
        token_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      }),
      { status: 200 }
    );
  }

  return new Response("not found", { status: 404 });
};

describe("createThirdwebClient", () => {
  test("creates checkout session", async () => {
    const client = createThirdwebClient({
      secretKey: "test-key",
      fetcher: mockFetch,
    });

    const session = await client.createCheckoutSession({
      input: {
        seller_address: "0x1234567890abcdef1234567890abcdef12345678",
        chain_id: 1,
        token_address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        amount: "1000000",
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        client_reference_id: "ord_123",
      },
    });

    expect(session.id).toBe("tw_checkout_123");
    expect(session.checkout_url).toContain("thirdweb.com/checkout");
  });

  test("gets transaction status", async () => {
    const client = createThirdwebClient({
      secretKey: "test-key",
      fetcher: mockFetch,
    });

    const status = await client.getTransactionStatus({
      transactionHash: "0xabc123",
      chainId: 1,
    });

    expect(status.status).toBe("confirmed");
    expect(status.transaction_hash).toBe("0xabc123");
  });

  test("throws on API error", async () => {
    const errorFetch: typeof fetch = async () =>
      new Response("Unauthorized", { status: 401 });

    const client = createThirdwebClient({
      secretKey: "bad-key",
      fetcher: errorFetch,
    });

    await expect(
      client.createCheckoutSession({
        input: {
          seller_address: "0x1234567890abcdef1234567890abcdef12345678",
          chain_id: 1,
          token_address: "0x0",
          amount: "100",
        },
      })
    ).rejects.toThrow("Thirdweb API request failed");
  });
});
