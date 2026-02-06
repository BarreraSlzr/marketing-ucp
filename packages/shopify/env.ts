export type ShopifyEnv = {
  storeDomain: string;
  storefrontToken: string;
  apiVersion?: string;
};

export function getShopifyEnv(): ShopifyEnv {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const storefrontToken = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION;

  if (!storeDomain) {
    throw new Error("SHOPIFY_STORE_DOMAIN is required");
  }

  if (!storefrontToken) {
    throw new Error("SHOPIFY_STOREFRONT_TOKEN is required");
  }

  return {
    storeDomain,
    storefrontToken,
    apiVersion,
  };
}
