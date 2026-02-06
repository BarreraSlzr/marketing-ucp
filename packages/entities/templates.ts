import { serializeCheckout, type AllCheckoutParams } from "./parsers";

/* ── Template Type ───────────────────────────────────────── */
export interface CheckoutTemplate {
  id: string;
  name: string;
  description: string;
  category: "demo" | "shopify" | "polar" | "custom";
  params: Partial<AllCheckoutParams>;
}

/* ── Demo Templates ──────────────────────────────────────── */

export const TEMPLATE_FLOWER_SHOP: CheckoutTemplate = {
  id: "flower-shop",
  name: "Flower Shop",
  description: "Classic flower delivery checkout with buyer and shipping.",
  category: "demo",
  params: {
    buyer_email: "jane@example.com",
    buyer_first_name: "Jane",
    buyer_last_name: "Doe",
    buyer_phone: "+1 (555) 123-4567",
    billing_line1: "123 Main St",
    billing_city: "San Francisco",
    billing_state: "CA",
    billing_postal_code: "94102",
    billing_country: "US",
    shipping_line1: "456 Oak Ave",
    shipping_city: "San Francisco",
    shipping_state: "CA",
    shipping_postal_code: "94103",
    shipping_country: "US",
    line_items: [
      {
        id: "prod_roses_001",
        name: "Red Roses Bouquet",
        quantity: 2,
        unit_price: 3500,
        total_price: 7000,
        sku: "ROSES-RED-12",
      },
      {
        id: "gift_card_001",
        name: "Handwritten Card",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
      },
    ],
    item_id: "prod_roses_001",
    item_name: "Red Roses Bouquet",
    item_quantity: 2,
    item_unit_price: 3500,
    item_sku: "ROSES-RED-12",
    payment_handler: "stripe",
    payment_credential_type: "token",
    payment_token: "tok_demo_flowers",
    checkout_currency: "USD",
    checkout_status: "incomplete",
  },
};

export const TEMPLATE_DIGITAL_PRODUCT: CheckoutTemplate = {
  id: "digital-product",
  name: "Digital Product",
  description: "SaaS license or digital download -- no shipping address needed.",
  category: "demo",
  params: {
    buyer_email: "developer@company.io",
    buyer_first_name: "Alex",
    buyer_last_name: "Smith",
    line_items: [
      {
        id: "prod_saas_001",
        name: "Pro License - Annual",
        quantity: 1,
        unit_price: 9900,
        total_price: 9900,
        sku: "LICENSE-PRO-ANNUAL",
      },
    ],
    item_id: "prod_saas_001",
    item_name: "Pro License - Annual",
    item_quantity: 1,
    item_unit_price: 9900,
    item_sku: "LICENSE-PRO-ANNUAL",
    payment_handler: "stripe",
    payment_credential_type: "token",
    payment_token: "tok_demo_digital",
    checkout_currency: "USD",
    checkout_status: "incomplete",
  },
};

export const TEMPLATE_SHOPIFY_PRODUCT: CheckoutTemplate = {
  id: "shopify-tshirt",
  name: "Shopify T-Shirt",
  description: "Physical product via Shopify Storefront integration.",
  category: "shopify",
  params: {
    buyer_email: "shopper@email.com",
    buyer_first_name: "Maria",
    buyer_last_name: "Garcia",
    billing_line1: "789 Commerce Blvd",
    billing_city: "Austin",
    billing_state: "TX",
    billing_postal_code: "73301",
    billing_country: "US",
    shipping_line1: "789 Commerce Blvd",
    shipping_city: "Austin",
    shipping_state: "TX",
    shipping_postal_code: "73301",
    shipping_country: "US",
    line_items: [
      {
        id: "gid://shopify/ProductVariant/12345",
        name: "UCP Logo T-Shirt (L)",
        quantity: 1,
        unit_price: 2999,
        total_price: 2999,
        sku: "TSHIRT-UCP-L",
      },
    ],
    item_id: "gid://shopify/ProductVariant/12345",
    item_name: "UCP Logo T-Shirt (L)",
    item_quantity: 1,
    item_unit_price: 2999,
    item_sku: "TSHIRT-UCP-L",
    payment_handler: "stripe",
    checkout_currency: "USD",
    checkout_status: "incomplete",
  },
};

export const TEMPLATE_POLAR_SUBSCRIPTION: CheckoutTemplate = {
  id: "polar-sub",
  name: "Polar Subscription",
  description: "Monthly subscription checkout via Polar payments.",
  category: "polar",
  params: {
    buyer_email: "subscriber@startup.dev",
    buyer_first_name: "Sam",
    buyer_last_name: "Taylor",
    line_items: [
      {
        id: "polar_plan_pro",
        name: "Pro Plan - Monthly",
        quantity: 1,
        unit_price: 1900,
        total_price: 1900,
        sku: "POLAR-PRO-MO",
      },
    ],
    item_id: "polar_plan_pro",
    item_name: "Pro Plan - Monthly",
    item_quantity: 1,
    item_unit_price: 1900,
    item_sku: "POLAR-PRO-MO",
    payment_handler: "paypal",
    payment_credential_type: "token",
    payment_token: "tok_polar_demo",
    checkout_currency: "USD",
    checkout_status: "incomplete",
  },
};

export const TEMPLATE_EMPTY: CheckoutTemplate = {
  id: "blank",
  name: "Blank Checkout",
  description: "Start from scratch with empty fields.",
  category: "custom",
  params: {
    checkout_currency: "USD",
    checkout_status: "incomplete",
  },
};

/* ── All templates ───────────────────────────────────────── */
export const ALL_TEMPLATES: CheckoutTemplate[] = [
  TEMPLATE_FLOWER_SHOP,
  TEMPLATE_DIGITAL_PRODUCT,
  TEMPLATE_SHOPIFY_PRODUCT,
  TEMPLATE_POLAR_SUBSCRIPTION,
  TEMPLATE_EMPTY,
];

/* ── Helpers ─────────────────────────────────────────────── */
export function getTemplateById(id: string): CheckoutTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function templateToUrl(
  template: CheckoutTemplate,
  basePath = "/checkout"
): string {
  return serializeCheckout(basePath, template.params as Record<string, unknown>);
}
