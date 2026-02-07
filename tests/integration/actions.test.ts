import { describe, expect, test } from "bun:test";
import {
  buildCheckoutRedirectUrl,
  submitAddressAction,
  submitBuyerAction,
  submitPaymentAction,
  submitProductAction,
  type FormState,
} from "../../app/actions";

function createFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

const emptyState: FormState = { success: false };

/* ── Buyer Action ───────────────────────────────────────── */

describe("submitBuyerAction", () => {
  test("accepts valid buyer", async () => {
    const formData = createFormData({
      buyer_email: "buyer@example.com",
      buyer_first_name: "Jane",
      buyer_last_name: "Doe",
    });

    const result = await submitBuyerAction(emptyState, formData);
    expect(result.success).toBe(true);
  });

  test("rejects missing email", async () => {
    const formData = createFormData({
      buyer_first_name: "Jane",
    });

    const result = await submitBuyerAction(emptyState, formData);
    expect(result.success).toBe(false);
    expect(result.errors?.email?.length).toBeGreaterThan(0);
  });
});

/* ── Address Action ─────────────────────────────────────── */

describe("submitAddressAction", () => {
  test("accepts valid shipping address", async () => {
    const formData = createFormData({
      _address_type: "shipping",
      shipping_line1: "123 Main St",
      shipping_city: "Austin",
      shipping_postal_code: "78701",
      shipping_country: "US",
    });

    const result = await submitAddressAction(emptyState, formData);
    expect(result.success).toBe(true);
  });

  test("rejects missing line1", async () => {
    const formData = createFormData({
      _address_type: "billing",
      billing_city: "Austin",
      billing_postal_code: "78701",
      billing_country: "US",
    });

    const result = await submitAddressAction(emptyState, formData);
    expect(result.success).toBe(false);
    expect(result.errors?.line1?.length).toBeGreaterThan(0);
  });
});

/* ── Payment Action ─────────────────────────────────────── */

describe("submitPaymentAction", () => {
  test("requires handler", async () => {
    const formData = createFormData({});

    const result = await submitPaymentAction(emptyState, formData);
    expect(result.success).toBe(false);
    expect(result.errors?.handler?.length).toBeGreaterThan(0);
  });

  test("accepts handler", async () => {
    const formData = createFormData({
      payment_handler: "stripe",
    });

    const result = await submitPaymentAction(emptyState, formData);
    expect(result.success).toBe(true);
  });
});

/* ── Product Action ─────────────────────────────────────── */

describe("submitProductAction", () => {
  test("rejects missing product name", async () => {
    const formData = createFormData({
      product_price: "1000",
    });

    const result = await submitProductAction(emptyState, formData);
    expect(result.success).toBe(false);
    expect(result.errors?.name?.length).toBeGreaterThan(0);
  });

  test("rejects negative price", async () => {
    const formData = createFormData({
      product_name: "Widget",
      product_price: "-5",
    });

    const result = await submitProductAction(emptyState, formData);
    expect(result.success).toBe(false);
    expect(result.errors?.price?.length).toBeGreaterThan(0);
  });

  test("accepts valid product", async () => {
    const formData = createFormData({
      product_name: "Widget",
      product_price: "1999",
    });

    const result = await submitProductAction(emptyState, formData);
    expect(result.success).toBe(true);
  });
});

/* ── Checkout Redirect ─────────────────────────────────── */

describe("buildCheckoutRedirectUrl", () => {
  test("builds URL with checkout status and currency", async () => {
    const formData = createFormData({
      buyer_email: "buyer@example.com",
    });

    const basePath = "/checkout/confirm";
    const url = await buildCheckoutRedirectUrl({
      basePath,
      formData,
    });

    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe(basePath);
    expect(parsed.searchParams.get("buyer_email")).toBe("buyer@example.com");
    expect(parsed.searchParams.get("checkout_status")).toBe(
      "ready_for_complete"
    );
    const checkoutCurrency = parsed.searchParams.get("checkout_currency");
    expect(checkoutCurrency ?? "USD").toBe("USD");
  });
});
