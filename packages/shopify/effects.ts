import { Effect } from "effect";
import type { ShopifyClient } from "./client";
import type { ShopifyCart, ShopifyCartLine, ShopifyProduct } from "./schemas";

export function fetchProductByHandleEffect(params: {
  client: ShopifyClient;
  handle: string;
}) {
  return Effect.tryPromise({
    try: () => params.client.fetchProductByHandle({ handle: params.handle }),
    catch: (error) => error as Error,
  });
}

export function createCartEffect(params: {
  client: ShopifyClient;
  lines: ShopifyCartLine[];
}) {
  return Effect.tryPromise({
    try: () => params.client.createCart({ lines: params.lines }),
    catch: (error) => error as Error,
  });
}

export type FetchProductEffect = Effect.Effect<ShopifyProduct, Error>;
export type CreateCartEffect = Effect.Effect<ShopifyCart, Error>;
