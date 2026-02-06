import { describe, expect, test } from "bun:test";
import { createLoader } from "nuqs/server";
import { allParsers, serializeCheckout } from "../parsers";

const loadCheckoutParams = createLoader(allParsers);

/* ── Round-Trip Parsing ─────────────────────────────────── */

describe("checkout parsers", () => {
  test("round-trips serialized values", async () => {
    const url = serializeCheckout("/checkout", {
      buyer_email: "buyer@example.com",
      item_name: "Widget",
      item_quantity: 2,
      payment_handler: "stripe",
      checkout_currency: "USD",
    });

    const result = await loadCheckoutParams(
      new URL(url, "http://localhost")
    );

    expect(result.buyer_email).toBe("buyer@example.com");
    expect(result.item_name).toBe("Widget");
    expect(result.item_quantity).toBe(2);
    expect(result.payment_handler).toBe("stripe");
    expect(result.checkout_currency).toBe("USD");
  });

  test("applies defaults and nulls for missing values", async () => {
    const result = await loadCheckoutParams(
      new URL("/checkout", "http://localhost")
    );

    expect(result.buyer_email).toBe("");
    expect(result.item_quantity).toBe(1);
    expect(result.checkout_currency).toBe("USD");
    expect(result.buyer_phone).toBeNull();
    expect(result.item_name).toBeNull();
  });
});
