import { Effect } from "effect";
import type { PolarClient } from "./client";
import type { PolarCheckoutInput, PolarCheckoutSession } from "./schemas";

export function createCheckoutSessionEffect(params: {
  client: PolarClient;
  input: PolarCheckoutInput;
}) {
  return Effect.tryPromise({
    try: () => params.client.createCheckoutSession({ input: params.input }),
    catch: (error) => error as Error,
  });
}

export type CheckoutSessionEffect = Effect.Effect<
  PolarCheckoutSession,
  Error
>;
