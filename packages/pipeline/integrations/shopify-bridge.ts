import { linkSessionToPlatform } from "../cross-platform-bridge";

// LEGEND: Shopify integration bridge
// Maps internal sessions to Shopify Orders and Checkouts
// All usage must comply with this LEGEND and the LICENSE

interface LinkShopifySessionParams {
  sessionId: string;
  pipelineId: string;
  shopifyOrderId: string;
}

/**
 * Link internal session to Shopify Order
 */
export async function linkShopifySession(
  params: LinkShopifySessionParams
): Promise<void> {
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "shopify",
    externalId: params.shopifyOrderId,
    metadata: {
      pipelineId: params.pipelineId,
    },
  });
}

interface FetchExternalDataParams {
  externalId: string;
}

interface ShopifyOrder {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: unknown[];
  customer: unknown;
  billing_address: unknown;
  shipping_address: unknown;
}

/**
 * Fetch Shopify Order data
 * Returns complete order details from Shopify Admin API
 */
export async function fetchExternalData(
  params: FetchExternalDataParams
): Promise<ShopifyOrder> {
  const shopifyDomain = process.env.SHOPIFY_DOMAIN;
  const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyDomain || !shopifyAccessToken) {
    throw new Error("Shopify credentials not configured");
  }

  const response = await fetch(
    `https://${shopifyDomain}/admin/api/2024-01/orders/${params.externalId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.order as ShopifyOrder;
}

/**
 * Link session to Shopify Checkout ID
 */
export async function linkShopifyCheckout(params: {
  sessionId: string;
  checkoutId: string;
}): Promise<void> {
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "shopify-checkout",
    externalId: params.checkoutId,
  });
}

/**
 * Fetch Shopify Checkout data
 */
export async function fetchShopifyCheckout(params: {
  checkoutId: string;
}): Promise<unknown> {
  const shopifyDomain = process.env.SHOPIFY_DOMAIN;
  const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shopifyDomain || !shopifyAccessToken) {
    throw new Error("Shopify credentials not configured");
  }

  const response = await fetch(
    `https://${shopifyDomain}/admin/api/2024-01/checkouts/${params.checkoutId}.json`,
    {
      headers: {
        "X-Shopify-Access-Token": shopifyAccessToken,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.checkout;
}
