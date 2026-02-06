import { describe, expect, test } from "bun:test";
import { PostalAddressSchema } from "../postal-address.zod";
import { BuyerSchema } from "../buyer.zod";
import { LineItemSchema } from "../line-item.zod";
import { TotalSchema } from "../total.zod";
import { PaymentCredentialSchema, PaymentSchema } from "../payment.zod";
import { LinkSchema } from "../link.zod";
import { MessageSchema } from "../message.zod";
import { CapabilitySchema, UCPCheckoutResponseSchema } from "../ucp-metadata.zod";
import { CheckoutStatusSchema, CheckoutSchema } from "../checkout.zod";
import { OrderStatusSchema, OrderSchema } from "../order.zod";
import {
  WebhookEventTypeSchema,
  WebhookEventSchema,
  WebhookProcessingStateSchema,
} from "../webhook.zod";

/* ── Helpers ─────────────────────────────────────────────── */

const validAddress = {
  line1: "123 Main St",
  city: "San Francisco",
  postal_code: "94102",
  country: "US",
};

const validBuyer = {
  email: "buyer@example.com",
};

const validLineItem = {
  id: "item_001",
  name: "Widget",
  quantity: 2,
  unit_price: 1000,
  total_price: 2000,
};

const validTotal = {
  type: "grand_total" as const,
  label: "Total",
  amount: 2000,
};

const validPaymentCredential = {
  type: "token" as const,
  token: "tok_demo_123",
};

const validPayment = {
  handler: "stripe",
  credential: validPaymentCredential,
};

const validLink = {
  rel: "privacy_policy" as const,
  href: "https://example.com/privacy",
  label: "Privacy Policy",
};

const validUCPMeta = {
  version: "2025-01-01",
  capabilities: [{ name: "com.ucp.checkout", version: "2025-01-01" }],
};

const validCheckout = {
  id: "chk_001",
  line_items: [validLineItem],
  status: "incomplete" as const,
  currency: "USD",
  totals: [validTotal],
  links: [validLink],
  ucp: validUCPMeta,
};

const validOrder = {
  id: "ord_001",
  status: "pending" as const,
  buyer: validBuyer,
  line_items: [validLineItem],
  totals: [validTotal],
  payment: validPayment,
  currency: "USD",
  created_at: "2025-06-01T00:00:00Z",
  updated_at: "2025-06-01T00:00:00Z",
};

/* ── PostalAddress ───────────────────────────────────────── */

describe("PostalAddressSchema", () => {
  test("accepts valid address", () => {
    const result = PostalAddressSchema.safeParse(validAddress);
    expect(result.success).toBe(true);
  });

  test("accepts address with optional fields", () => {
    const result = PostalAddressSchema.safeParse({
      ...validAddress,
      line2: "Apt 4B",
      state: "CA",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing line1", () => {
    const result = PostalAddressSchema.safeParse({
      city: "SF",
      postal_code: "94102",
      country: "US",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid country code length", () => {
    const result = PostalAddressSchema.safeParse({
      ...validAddress,
      country: "USA",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty line1", () => {
    const result = PostalAddressSchema.safeParse({
      ...validAddress,
      line1: "",
    });
    expect(result.success).toBe(false);
  });
});

/* ── Buyer ───────────────────────────────────────────────── */

describe("BuyerSchema", () => {
  test("accepts minimal buyer (email only)", () => {
    const result = BuyerSchema.safeParse(validBuyer);
    expect(result.success).toBe(true);
  });

  test("accepts full buyer with addresses", () => {
    const result = BuyerSchema.safeParse({
      ...validBuyer,
      phone: "+1-555-123-4567",
      first_name: "Jane",
      last_name: "Doe",
      billing_address: validAddress,
      shipping_address: validAddress,
      customer_id: "cust_001",
      accepts_marketing: true,
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid email", () => {
    const result = BuyerSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  test("rejects missing email", () => {
    const result = BuyerSchema.safeParse({ first_name: "Jane" });
    expect(result.success).toBe(false);
  });
});

/* ── LineItem ────────────────────────────────────────────── */

describe("LineItemSchema", () => {
  test("accepts valid line item", () => {
    const result = LineItemSchema.safeParse(validLineItem);
    expect(result.success).toBe(true);
  });

  test("accepts with optional fields", () => {
    const result = LineItemSchema.safeParse({
      ...validLineItem,
      description: "A fine widget",
      image_url: "https://example.com/widget.jpg",
      sku: "WDG-001",
    });
    expect(result.success).toBe(true);
  });

  test("rejects quantity of 0", () => {
    const result = LineItemSchema.safeParse({
      ...validLineItem,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative unit_price", () => {
    const result = LineItemSchema.safeParse({
      ...validLineItem,
      unit_price: -100,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer quantity", () => {
    const result = LineItemSchema.safeParse({
      ...validLineItem,
      quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid image_url", () => {
    const result = LineItemSchema.safeParse({
      ...validLineItem,
      image_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

/* ── Total ───────────────────────────────────────────────── */

describe("TotalSchema", () => {
  test("accepts valid total", () => {
    const result = TotalSchema.safeParse(validTotal);
    expect(result.success).toBe(true);
  });

  test("accepts all total types", () => {
    const types = ["subtotal", "tax", "shipping", "discount", "grand_total"];
    for (const type of types) {
      const result = TotalSchema.safeParse({ type, label: type, amount: 100 });
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid total type", () => {
    const result = TotalSchema.safeParse({
      type: "unknown",
      label: "Bad",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});

/* ── Payment ─────────────────────────────────────────────── */

describe("PaymentCredentialSchema", () => {
  test("accepts token credential", () => {
    const result = PaymentCredentialSchema.safeParse(validPaymentCredential);
    expect(result.success).toBe(true);
  });

  test("accepts card credential", () => {
    const result = PaymentCredentialSchema.safeParse({
      type: "card",
      card_number: "****4242",
      expiry: "12/26",
      brand: "visa",
    });
    expect(result.success).toBe(true);
  });

  test("rejects unknown credential type", () => {
    const result = PaymentCredentialSchema.safeParse({
      type: "crypto",
      wallet: "0x123",
    });
    expect(result.success).toBe(false);
  });
});

describe("PaymentSchema", () => {
  test("accepts valid payment", () => {
    const result = PaymentSchema.safeParse(validPayment);
    expect(result.success).toBe(true);
  });

  test("accepts payment with billing address", () => {
    const result = PaymentSchema.safeParse({
      ...validPayment,
      billing_address: validAddress,
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing handler", () => {
    const result = PaymentSchema.safeParse({
      credential: validPaymentCredential,
    });
    expect(result.success).toBe(false);
  });
});

/* ── Link ────────────────────────────────────────────────── */

describe("LinkSchema", () => {
  test("accepts valid link", () => {
    const result = LinkSchema.safeParse(validLink);
    expect(result.success).toBe(true);
  });

  test("accepts all rel types", () => {
    const rels = ["privacy_policy", "terms_of_service", "return_policy", "support"];
    for (const rel of rels) {
      const result = LinkSchema.safeParse({
        rel,
        href: "https://example.com",
        label: rel,
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid URL", () => {
    const result = LinkSchema.safeParse({
      ...validLink,
      href: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

/* ── Message ─────────────────────────────────────────────── */

describe("MessageSchema", () => {
  test("accepts error message", () => {
    const result = MessageSchema.safeParse({
      type: "error",
      code: "INVALID_EMAIL",
      content: "Email is not valid",
    });
    expect(result.success).toBe(true);
  });

  test("accepts error message with severity", () => {
    const result = MessageSchema.safeParse({
      type: "error",
      code: "MISSING_FIELD",
      content: "Address required",
      path: "$.buyer.billing_address",
      severity: "requires_buyer_input",
    });
    expect(result.success).toBe(true);
  });

  test("accepts info message", () => {
    const result = MessageSchema.safeParse({
      type: "info",
      content: "Free shipping applied!",
    });
    expect(result.success).toBe(true);
  });

  test("accepts info message with markdown", () => {
    const result = MessageSchema.safeParse({
      type: "info",
      content: "**Bold** info",
      content_type: "markdown",
    });
    expect(result.success).toBe(true);
  });

  test("rejects unknown message type", () => {
    const result = MessageSchema.safeParse({
      type: "warning",
      content: "Something",
    });
    expect(result.success).toBe(false);
  });
});

/* ── UCP Metadata ────────────────────────────────────────── */

describe("UCPCheckoutResponseSchema", () => {
  test("accepts valid UCP metadata", () => {
    const result = UCPCheckoutResponseSchema.safeParse(validUCPMeta);
    expect(result.success).toBe(true);
  });

  test("rejects invalid version format", () => {
    const result = UCPCheckoutResponseSchema.safeParse({
      version: "v1.0",
      capabilities: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects capability with bad version", () => {
    const result = CapabilitySchema.safeParse({
      name: "com.ucp.test",
      version: "1.0.0",
    });
    expect(result.success).toBe(false);
  });
});

/* ── Checkout ────────────────────────────────────────────── */

describe("CheckoutSchema", () => {
  test("accepts valid checkout", () => {
    const result = CheckoutSchema.safeParse(validCheckout);
    expect(result.success).toBe(true);
  });

  test("accepts checkout with buyer and payment", () => {
    const result = CheckoutSchema.safeParse({
      ...validCheckout,
      buyer: validBuyer,
      payment: validPayment,
    });
    expect(result.success).toBe(true);
  });

  test("rejects checkout with empty line_items", () => {
    const result = CheckoutSchema.safeParse({
      ...validCheckout,
      line_items: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid currency length", () => {
    const result = CheckoutSchema.safeParse({
      ...validCheckout,
      currency: "US",
    });
    expect(result.success).toBe(false);
  });

  test("all statuses are valid", () => {
    const statuses = [
      "incomplete",
      "requires_escalation",
      "ready_for_complete",
      "complete_in_progress",
      "completed",
      "canceled",
    ];
    for (const status of statuses) {
      const result = CheckoutStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });
});

/* ── Order ───────────────────────────────────────────────── */

describe("OrderSchema", () => {
  test("accepts valid order", () => {
    const result = OrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  test("accepts order with optional fields", () => {
    const result = OrderSchema.safeParse({
      ...validOrder,
      checkout_id: "chk_001",
      tracking_number: "1Z999AA10123456784",
      external_id: "shopify_ord_123",
      metadata: { source: "web" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects order without buyer", () => {
    const { buyer: _, ...orderWithoutBuyer } = validOrder;
    const result = OrderSchema.safeParse(orderWithoutBuyer);
    expect(result.success).toBe(false);
  });

  test("all order statuses are valid", () => {
    const statuses = [
      "pending", "confirmed", "processing", "shipped",
      "delivered", "returned", "refunded", "failed", "canceled",
    ];
    for (const status of statuses) {
      const result = OrderStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });
});

/* ── Webhook ─────────────────────────────────────────────── */

describe("WebhookEventSchema", () => {
  test("accepts valid webhook event", () => {
    const result = WebhookEventSchema.safeParse({
      id: "evt_001",
      type: "order.created",
      timestamp: "2025-06-01T12:00:00Z",
      source: "stripe",
      data: { amount: 2000 },
    });
    expect(result.success).toBe(true);
  });

  test("accepts webhook with order and retry_count", () => {
    const result = WebhookEventSchema.safeParse({
      id: "evt_002",
      type: "order.confirmed",
      timestamp: "2025-06-01T12:00:00Z",
      source: "polar",
      order: validOrder,
      data: {},
      signature: "sha256=abc123",
      retry_count: 2,
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid event type", () => {
    const result = WebhookEventTypeSchema.safeParse("order.unknown");
    expect(result.success).toBe(false);
  });

  test("rejects invalid source", () => {
    const result = WebhookEventSchema.safeParse({
      id: "evt_003",
      type: "order.created",
      timestamp: "2025-06-01T12:00:00Z",
      source: "unknown_provider",
      data: {},
    });
    expect(result.success).toBe(false);
  });

  test("all event types are valid", () => {
    const types = [
      "order.created", "order.confirmed", "order.shipped",
      "order.delivered", "order.failed", "order.refunded", "order.canceled",
      "payment.confirmed", "payment.failed", "payment.refunded",
      "discount.applied", "tax.calculated",
    ];
    for (const type of types) {
      const result = WebhookEventTypeSchema.safeParse(type);
      expect(result.success).toBe(true);
    }
  });
});

describe("WebhookProcessingStateSchema", () => {
  test("accepts valid processing state", () => {
    const result = WebhookProcessingStateSchema.safeParse({
      event_id: "evt_001",
      status: "success",
      processed_at: "2025-06-01T12:01:00Z",
    });
    expect(result.success).toBe(true);
  });

  test("accepts failed state with error and retry", () => {
    const result = WebhookProcessingStateSchema.safeParse({
      event_id: "evt_002",
      status: "failed",
      error: "Connection timeout",
      next_retry_at: "2025-06-01T12:05:00Z",
    });
    expect(result.success).toBe(true);
  });
});
