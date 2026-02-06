import { describe, expect, test } from "bun:test";
import { createPolarClient } from "../client";

const mockFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;

  if (url.endsWith("/checkout/sessions") && init?.method === "POST") {
    return new Response(
      JSON.stringify({
        id: "cs_123",
        url: "https://polar.sh/checkout/cs_123",
        status: "created",
      }),
      { status: 200 }
    );
  }

  return new Response("not found", { status: 404 });
};

describe("createPolarClient", () => {
  test("creates checkout session", async () => {
    const client = createPolarClient({
      apiKey: "test-key",
      fetcher: mockFetch,
    });

    const session = await client.createCheckoutSession({
      input: {
        order_id: "ord_123",
        currency: "USD",
        line_items: [
          {
            id: "item_1",
            name: "Widget",
            quantity: 1,
            unit_price: 2500,
            total_price: 2500,
          },
        ],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
        customer_email: "buyer@example.com",
      },
    });

    expect(session.id).toBe("cs_123");
    expect(session.url).toContain("polar.sh/checkout");
  });
});
