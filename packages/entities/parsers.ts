import {
    createSerializer,
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    type inferParserType,
} from "nuqs/server";
import { LineItemSchema, type LineItem } from "./line-item.zod";

/**
 * nuqs search-param parsers for each entity.
 * Every form field maps 1:1 to a URL search param so the entire
 * checkout state is stateless and shareable via URL.
 */

/* ── Buyer ───────────────────────────────────────────────── */
export const buyerParsers = {
  buyer_email: parseAsString.withDefault(""),
  buyer_phone: parseAsString,
  buyer_first_name: parseAsString,
  buyer_last_name: parseAsString,
  buyer_customer_id: parseAsString,
  buyer_accepts_marketing: parseAsBoolean,
};

/* ── Buyer Billing Address ───────────────────────────────── */
export const billingAddressParsers = {
  billing_line1: parseAsString.withDefault(""),
  billing_line2: parseAsString,
  billing_city: parseAsString.withDefault(""),
  billing_state: parseAsString,
  billing_postal_code: parseAsString.withDefault(""),
  billing_country: parseAsString.withDefault(""),
};

/* ── Buyer Shipping Address ──────────────────────────────── */
export const shippingAddressParsers = {
  shipping_line1: parseAsString.withDefault(""),
  shipping_line2: parseAsString,
  shipping_city: parseAsString.withDefault(""),
  shipping_state: parseAsString,
  shipping_postal_code: parseAsString.withDefault(""),
  shipping_country: parseAsString.withDefault(""),
};

/* ── Payment ─────────────────────────────────────────────── */
export const paymentParsers = {
  payment_handler: parseAsString.withDefault(""),
  payment_credential_type: parseAsStringEnum(["token", "card"] as const),
  payment_token: parseAsString,
};

/* ── Line Item (single item editing via URL) ─────────────── */
export const lineItemParsers = {
  item_id: parseAsString,
  item_name: parseAsString,
  item_description: parseAsString,
  item_quantity: parseAsInteger.withDefault(1),
  item_unit_price: parseAsInteger.withDefault(0),
  item_sku: parseAsString,
  item_image_url: parseAsString,
};

/* ── Line Items (multi-item cart via JSON) ──────────────── */
const lineItemsSchema = LineItemSchema.array();
const parseLineItems = (value: unknown): LineItem[] | null => {
  const result = lineItemsSchema.safeParse(value);
  return result.success ? result.data : null;
};

export const lineItemsParsers = {
  line_items: parseAsJson(parseLineItems).withDefault([]),
};

/* ── Product (content creation fields) ───────────────────── */
export const productParsers = {
  product_name: parseAsString.withDefault(""),
  product_description: parseAsString.withDefault(""),
  product_price: parseAsInteger.withDefault(0),
  product_currency: parseAsString.withDefault("USD"),
  product_sku: parseAsString.withDefault(""),
  product_image_url: parseAsString,
  product_category: parseAsString,
  product_vendor: parseAsString,
  product_inventory: parseAsInteger.withDefault(0),
  product_published: parseAsBoolean.withDefault(false),
};

/* ── Checkout Session ────────────────────────────────────── */
export const checkoutParsers = {
  checkout_id: parseAsString,
  checkout_status: parseAsStringEnum([
    "incomplete",
    "requires_escalation",
    "ready_for_complete",
    "complete_in_progress",
    "completed",
    "canceled",
  ] as const),
  checkout_currency: parseAsString
    .withDefault("USD")
    .withOptions({ clearOnDefault: false }),
};

/* ── Aggregated: all parsers for the full checkout page ──── */
export const allParsers = {
  ...checkoutParsers,
  ...buyerParsers,
  ...billingAddressParsers,
  ...shippingAddressParsers,
  ...paymentParsers,
  ...lineItemParsers,
  ...lineItemsParsers,
};

/* ── Serializer for building shareable URLs ──────────────── */
export const serializeCheckout = createSerializer(allParsers);
export const serializeProduct = createSerializer(productParsers);

/* ── Inferred types from parsers ─────────────────────────── */
export type BuyerParams = inferParserType<typeof buyerParsers>;
export type BillingAddressParams = inferParserType<typeof billingAddressParsers>;
export type ShippingAddressParams = inferParserType<
  typeof shippingAddressParsers
>;
export type PaymentParams = inferParserType<typeof paymentParsers>;
export type LineItemParams = inferParserType<typeof lineItemParsers>;
export type LineItemsParams = inferParserType<typeof lineItemsParsers>;
export type CheckoutParams = inferParserType<typeof checkoutParsers>;
export type AllCheckoutParams = inferParserType<typeof allParsers>;
export type ProductParams = inferParserType<typeof productParsers>;
