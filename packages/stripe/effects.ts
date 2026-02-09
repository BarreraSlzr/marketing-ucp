import { tracedStep, type PipelineStep, type PipelineType } from "@repo/pipeline";
import { Effect } from "effect";
import type { StripeClient } from "./client";
import type { StripeCheckoutInput, StripeCheckoutSession } from "./schemas";

export function createCheckoutSessionEffect(params: {
  client: StripeClient;
  input: StripeCheckoutInput;
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
    try: () => params.client.createCheckoutSession({ input: params.input }),
    catch: (error) => error as Error,
  });

  if (!params.trace) {
    return effect;
  }

  return tracedStep({
    session_id: params.trace.session_id,
    pipeline_type: params.trace.pipeline_type,
    step: params.trace.step ?? "payment_initiated",
    handler: params.trace.handler ?? "stripe",
    sequence: params.trace.sequence,
    metadata: params.trace.metadata,
    input: params.input,
    effect,
  });
}

export type CheckoutSessionEffect = Effect.Effect<
  StripeCheckoutSession,
  Error
>;
