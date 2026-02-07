import { tracedStep, type PipelineStep, type PipelineType } from "@repo/pipeline";
import { Effect } from "effect";
import type { ShopifyClient } from "./client";
import type { ShopifyCart, ShopifyCartLine, ShopifyProduct } from "./schemas";

export function fetchProductByHandleEffect(params: {
  client: ShopifyClient;
  handle: string;
  trace?: {
    session_id: string;
    pipeline_type: PipelineType;
    step?: PipelineStep;
    handler?: string;
    sequence?: number;
    metadata?: Record<string, unknown>;
  };
}) {
  const effect = Effect.tryPromise({
    try: () => params.client.fetchProductByHandle({ handle: params.handle }),
    catch: (error) => error as Error,
  });

  if (!params.trace) {
    return effect;
  }

  return tracedStep({
    session_id: params.trace.session_id,
    pipeline_type: params.trace.pipeline_type,
    step: params.trace.step ?? "fulfillment_delegated",
    handler: params.trace.handler ?? "shopify",
    sequence: params.trace.sequence,
    metadata: params.trace.metadata,
    input: { handle: params.handle },
    effect,
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
