import { describe, expect, test } from "bun:test";
import { buildCheckoutResponse } from "../../app/api/checkout/route";

const baseInput = {
  currency: "usd",
  line_items: [
    {
      id: "item_1",
      name: "Starter",
      quantity: 2,
      unit_price: 1500,
    },
  ],
};

describe("buildCheckoutResponse", () => {
  test("computes totals and normalizes currency", () => {
    const response = buildCheckoutResponse({
      input: baseInput,
      origin: "https://example.com",
    });

    expect(response.checkout.currency).toBe("USD");
    expect(response.checkout.totals[0]?.amount).toBe(3000);
    expect(response.totals[1]?.amount).toBe(3000);
    expect(response.checkout.line_items[0]?.total_price).toBe(3000);
  });

  test("returns checkout URL with serialized params", () => {
    const response = buildCheckoutResponse({
      input: baseInput,
      origin: "https://example.com",
    });

    const url = new URL(response.checkout_url, "https://example.com");
    expect(url.pathname).toBe("/checkout");
    expect(url.searchParams.get("checkout_currency")).toBe("USD");
    expect(url.searchParams.get("item_name")).toBe("Starter");
  });
});
