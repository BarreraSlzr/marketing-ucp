import { describe, expect, test } from "bun:test";
import { serializeCheckout } from "../parsers";
import {
    ALL_TEMPLATES,
    TEMPLATE_DIGITAL_PRODUCT,
    TEMPLATE_EMPTY,
    TEMPLATE_FLOWER_SHOP,
    TEMPLATE_POLAR_SUBSCRIPTION,
    TEMPLATE_SHOPIFY_PRODUCT,
    getTemplateById,
    templateToUrl,
} from "../templates";

/* ── Template Registry ───────────────────────────────────── */

describe("ALL_TEMPLATES", () => {
  test("contains exactly 5 templates", () => {
    expect(ALL_TEMPLATES).toHaveLength(5);
  });

  test("all templates have unique IDs", () => {
    const ids = ALL_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("all templates have required fields", () => {
    for (const template of ALL_TEMPLATES) {
      expect(template.id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(["demo", "shopify", "polar", "custom"]).toContain(template.category);
      expect(typeof template.params).toBe("object");
    }
  });
});

/* ── getTemplateById ─────────────────────────────────────── */

describe("getTemplateById", () => {
  test("returns template by valid ID", () => {
    const result = getTemplateById("flower-shop");
    expect(result).toBe(TEMPLATE_FLOWER_SHOP);
  });

  test("returns undefined for unknown ID", () => {
    const result = getTemplateById("nonexistent");
    expect(result).toBeUndefined();
  });

  test("finds each template", () => {
    for (const template of ALL_TEMPLATES) {
      expect(getTemplateById(template.id)).toBe(template);
    }
  });
});

/* ── templateToUrl ───────────────────────────────────────── */

describe("templateToUrl", () => {
  test("generates URL string for flower shop", () => {
    const url = templateToUrl(TEMPLATE_FLOWER_SHOP);
    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe("/checkout");
    expect(parsed.searchParams.get("buyer_email")).toBe("jane@example.com");
    expect(parsed.searchParams.get("item_name")).toBe("Red Roses Bouquet");
    expect(parsed.searchParams.get("item_unit_price")).toBe("3500");
    const items = JSON.parse(parsed.searchParams.get("line_items") ?? "[]");
    expect(items.length).toBeGreaterThan(1);
  });

  test("generates URL for digital product without shipping", () => {
    const url = templateToUrl(TEMPLATE_DIGITAL_PRODUCT);
    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe("/checkout");
    expect(parsed.searchParams.get("buyer_email")).toBe("developer@company.io");
    expect(parsed.searchParams.has("shipping_line1")).toBe(false);
  });

  test("generates URL for Shopify template", () => {
    const url = templateToUrl(TEMPLATE_SHOPIFY_PRODUCT);
    expect(url).toContain("item_id=gid");
    expect(url).toContain("shipping_city=Austin");
  });

  test("generates URL for Polar subscription", () => {
    const url = templateToUrl(TEMPLATE_POLAR_SUBSCRIPTION);
    expect(url).toContain("payment_handler=paypal");
    expect(url).toContain("item_name=Pro+Plan");
  });

  test("blank template produces minimal URL", () => {
    const url = templateToUrl(TEMPLATE_EMPTY);
    expect(url).toContain("/checkout?");
    // Should only have currency and status
    expect(url).not.toContain("buyer_email");
    expect(url).not.toContain("item_name");
  });

  test("respects custom basePath", () => {
    const url = templateToUrl(TEMPLATE_FLOWER_SHOP, "/custom/checkout");
    expect(url).toStartWith("/custom/checkout?");
  });
});

/* ── Serialization Round-Trip ────────────────────────────── */

describe("serializeCheckout", () => {
  test("produces valid URL search string", () => {
    const url = serializeCheckout("/checkout", {
      buyer_email: "test@test.com",
      line_items: [
        {
          id: "item_123",
          name: "Widget",
          quantity: 3,
          unit_price: 1500,
          total_price: 4500,
        },
      ],
      item_name: "Widget",
      item_quantity: 3,
    });
    const parsed = new URL(url, "http://localhost");
    expect(parsed.pathname).toBe("/checkout");
    expect(parsed.searchParams.get("buyer_email")).toBe("test@test.com");
    expect(parsed.searchParams.get("item_name")).toBe("Widget");
    expect(parsed.searchParams.get("item_quantity")).toBe("3");
    const items = JSON.parse(parsed.searchParams.get("line_items") ?? "[]");
    expect(items[0]?.id).toBe("item_123");
  });

  test("omits null/undefined values", () => {
    const url = serializeCheckout("/checkout", {
      buyer_email: "a@b.com",
      buyer_phone: null,
      buyer_first_name: undefined,
    });
    expect(url).toContain("buyer_email");
    expect(url).not.toContain("buyer_phone");
    expect(url).not.toContain("buyer_first_name");
  });

  test("handles special characters in values", () => {
    const url = serializeCheckout("/checkout", {
      item_name: "T-Shirt (Large) & More",
    });
    expect(url).toContain("item_name=");
    // Should be URL-encoded
    expect(url).not.toContain("&More");
  });
});

/* ── Template Data Integrity ─────────────────────────────── */

describe("template data integrity", () => {
  test("flower shop has shipping address", () => {
    const params = TEMPLATE_FLOWER_SHOP.params;
    expect(params.shipping_line1).toBeTruthy();
    expect(params.shipping_city).toBeTruthy();
    expect(params.shipping_country).toBeTruthy();
  });

  test("digital product has no shipping address", () => {
    const params = TEMPLATE_DIGITAL_PRODUCT.params;
    expect(params.shipping_line1).toBeUndefined();
  });

  test("all non-blank templates have buyer_email", () => {
    const nonBlank = ALL_TEMPLATES.filter((t) => t.id !== "blank");
    for (const template of nonBlank) {
      expect(template.params.buyer_email).toBeTruthy();
    }
  });

  test("all non-blank templates have at least one item", () => {
    const nonBlank = ALL_TEMPLATES.filter((t) => t.id !== "blank");
    for (const template of nonBlank) {
      const hasItems = Array.isArray(template.params.line_items)
        ? template.params.line_items.length > 0
        : false;
      const hasLegacyItem = Boolean(
        template.params.item_id && template.params.item_name
      );
      expect(hasItems || hasLegacyItem).toBe(true);
    }
  });

  test("all templates have checkout_currency", () => {
    for (const template of ALL_TEMPLATES) {
      expect(template.params.checkout_currency).toBe("USD");
    }
  });
});
