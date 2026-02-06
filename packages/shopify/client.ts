import {
    ShopifyCartSchema,
    ShopifyProductSchema,
    type ShopifyCart,
    type ShopifyCartLine,
    type ShopifyProduct,
} from "./schemas";

export type ShopifyClientConfig = {
  storeDomain: string;
  storefrontToken: string;
  apiVersion?: string;
  fetcher?: typeof fetch;
};

export type ShopifyClient = {
  fetchProductByHandle: (params: { handle: string }) => Promise<ShopifyProduct>;
  createCart: (params: { lines: ShopifyCartLine[] }) => Promise<ShopifyCart>;
  addCartLines: (params: {
    cartId: string;
    lines: ShopifyCartLine[];
  }) => Promise<ShopifyCart>;
};

class ShopifyClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ShopifyClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

const PRODUCT_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      handle
      title
      description
      images(first: 5) {
        nodes {
          url
        }
      }
      variants(first: 10) {
        nodes {
          id
          title
          price
          availableForSale
        }
      }
    }
  }
`;

const CREATE_CART_MUTATION = `
  mutation CreateCart($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;

const ADD_LINES_MUTATION = `
  mutation AddCartLines($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
      }
    }
  }
`;

export function createShopifyStorefrontClient(
  config: ShopifyClientConfig
): ShopifyClient {
  const apiVersion = config.apiVersion ?? "2024-10";
  const fetcher = config.fetcher ?? fetch;
  const endpoint = `https://${config.storeDomain}/api/${apiVersion}/graphql.json`;

  async function request(params: {
    query: string;
    variables: Record<string, unknown>;
  }) {
    const res = await fetcher(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": config.storefrontToken,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ShopifyClientError(
        `Shopify Storefront request failed: ${res.status} ${text}`
      );
    }

    return res.json();
  }

  return {
    async fetchProductByHandle(params) {
      const data = await request({
        query: PRODUCT_QUERY,
        variables: { handle: params.handle },
      });

      const product = data?.data?.productByHandle;
      if (!product) {
        throw new ShopifyClientError("Product not found");
      }

      const normalized = {
        id: product.id,
        handle: product.handle,
        title: product.title,
        description: product.description ?? undefined,
        images: product.images?.nodes ?? [],
        variants: product.variants?.nodes ?? [],
      };

      return ShopifyProductSchema.parse(normalized);
    },

    async createCart(params) {
      const data = await request({
        query: CREATE_CART_MUTATION,
        variables: { lines: params.lines },
      });

      const cart = data?.data?.cartCreate?.cart;
      if (!cart) {
        throw new ShopifyClientError("Failed to create cart");
      }

      return ShopifyCartSchema.parse(cart);
    },

    async addCartLines(params) {
      const data = await request({
        query: ADD_LINES_MUTATION,
        variables: { cartId: params.cartId, lines: params.lines },
      });

      const cart = data?.data?.cartLinesAdd?.cart;
      if (!cart) {
        throw new ShopifyClientError("Failed to add cart lines");
      }

      return ShopifyCartSchema.parse(cart);
    },
  };
}
