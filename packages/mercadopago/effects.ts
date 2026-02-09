import { tracedStep, type PipelineStep, type PipelineType } from "@repo/pipeline";
import { Effect } from "effect";
import type { MercadoPagoClient } from "./client";
import type {
    MercadoPagoPreferenceInput,
    MercadoPagoPreferenceResponse,
} from "./schemas";

export function createMercadoPagoPreferenceEffect(params: {
  client: MercadoPagoClient;
  input: MercadoPagoPreferenceInput;
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
    try: () => params.client.createPreference({ input: params.input }),
    catch: (error) => error as Error,
  });

  if (!params.trace) {
    return effect;
  }

  return tracedStep({
    session_id: params.trace.session_id,
    pipeline_type: params.trace.pipeline_type,
    step: params.trace.step ?? "payment_initiated",
    handler: params.trace.handler ?? "mercadopago",
    sequence: params.trace.sequence,
    metadata: params.trace.metadata,
    input: params.input,
    effect,
  });
}

export type MercadoPagoPreferenceEffect = Effect.Effect<
  MercadoPagoPreferenceResponse,
  Error
>;
