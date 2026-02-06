import type { PolarClient } from "@repo/polar";
import { describe, expect, test } from "bun:test";
import { createPolarCheckoutSession } from "../../app/api/polar/checkout/route";

const mockClient: PolarClient = {
  async createCheckoutSession() {
    return {
      id: "cs_demo",
      url: "https://polar.sh/checkout/cs_demo",
      status: "created",
    };
  },
};

describe("createPolarCheckoutSession", () => {
  test("returns checkout session payload", async () => {
    const session = await createPolarCheckoutSession({
      client: mockClient,
      input: {
        order_id: "ord_999",
        currency: "USD",
        line_items: [
          {
            id: "item_1",
            name: "Starter",
            quantity: 1,
            unit_price: 2500,
            total_price: 2500,
          },
        ],
        success_url: "https://example.com/success",
        cancel_url: "https://example.com/cancel",
      },
    });

    expect(session.id).toBe("cs_demo");
    expect(session.url).toContain("polar.sh/checkout");
  });
});
