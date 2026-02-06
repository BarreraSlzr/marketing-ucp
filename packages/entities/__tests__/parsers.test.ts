import { describe, expect, test } from "bun:test";
import { createLoader } from "nuqs/server";
import { allParsers, serializeCheckout } from "../parsers";

const loadCheckoutParams = createLoader(allParsers);

/* ── Round-Trip Parsing ─────────────────────────────────── */

describe("checkout parsers", () => {
  test("round-trips serialized values", async () => {
    const url = serializeCheckout("/checkout", {
      buyer_email: "buyer@example.com",
      line_items: [
        {
          id: "item_001",
          name: "Widget",
          quantity: 2,
          unit_price: 1200,
          total_price: 2400,
        },
      ],
      item_name: "Widget",
      item_quantity: 2,
      payment_handler: "stripe",
      checkout_currency: "USD",
    });

    const result = await loadCheckoutParams(new URL(url, "http://localhost"));

    expect(result.buyer_email).toBe("buyer@example.com");
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0]?.id).toBe("item_001");
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

  test("defaults line_items to empty array", async () => {
    const result = await loadCheckoutParams(
      new URL("/checkout", "http://localhost")
    );

    expect(result.line_items).toEqual([]);
  });

  test("applies item defaults when omitted", async () => {
    const url = serializeCheckout("/checkout", {
      item_name: "Widget",
    });

    const result = await loadCheckoutParams(new URL(url, "http://localhost"));

    expect(result.item_name).toBe("Widget");
    expect(result.item_quantity).toBe(1);
    expect(result.item_unit_price).toBe(0);
  });

  test("returns null for optional strings and booleans when missing", async () => {
    const result = await loadCheckoutParams(
      new URL("/checkout", "http://localhost")
    );

    expect(result.buyer_first_name).toBeNull();
    expect(result.payment_token).toBeNull();
    expect(result.item_description).toBeNull();
    expect(result.buyer_accepts_marketing).toBeNull();
  });

  test("round-trips checkout status enum values", async () => {
    const url = serializeCheckout("/checkout", {
      checkout_status: "completed",
    });

    const result = await loadCheckoutParams(new URL(url, "http://localhost"));

    expect(result.checkout_status).toBe("completed");
  });
});
