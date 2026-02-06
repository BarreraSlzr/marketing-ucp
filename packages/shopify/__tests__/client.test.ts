import { describe, expect, test } from "bun:test";
import { createShopifyStorefrontClient } from "../client";

const mockFetch: typeof fetch = async () => {
  return new Response(
    JSON.stringify({
      data: {
        productByHandle: {
          id: "gid://shopify/Product/123",
          handle: "ucp-shirt",
          title: "UCP Shirt",
          description: "Soft cotton tee",
          images: { nodes: [{ url: "https://cdn.example.com/shirt.png" }] },
          variants: {
            nodes: [
              {
                id: "gid://shopify/ProductVariant/1",
                title: "Large",
                price: "29.99",
                availableForSale: true,
              },
            ],
          },
        },
      },
    }),
    { status: 200 }
  );
};

describe("createShopifyStorefrontClient", () => {
  test("fetches product by handle", async () => {
    const client = createShopifyStorefrontClient({
      storeDomain: "example.myshopify.com",
      storefrontToken: "token",
      fetcher: mockFetch,
    });

    const product = await client.fetchProductByHandle({ handle: "ucp-shirt" });

    expect(product.handle).toBe("ucp-shirt");
    expect(product.variants[0]?.availableForSale).toBe(true);
  });
});
