// LEGEND: EffectTS traced step wrapper for pipeline observability
// Transparently emits PipelineEvents on success/failure
// All usage must comply with this LEGEND and the LICENSE

import { Effect } from "effect";
import {
    computeInputChecksum,
    computeOutputChecksum,
} from "./checksum-utils";
import type { PipelineType } from "./constants";
import { PipelineEmitter } from "./emitter";
import { createPipelineEvent, type PipelineStep } from "./event";

export interface TracedStepParams<A, E> {
  session_id: string;
  pipeline_type: PipelineType;
  step: PipelineStep;
  handler: string;
  effect: Effect.Effect<A, E>;
  input?: unknown;
  emitter?: PipelineEmitter;
  sequence?: number;
  metadata?: Record<string, unknown>;
}

function nowMs(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return 0;
}

async function emitSafe(params: {
  emitter: PipelineEmitter;
  session_id: string;
  pipeline_type: PipelineType;
  step: PipelineStep;
  handler: string;
  status: "success" | "failure";
  sequence?: number;
  input_checksum?: string;
  output_checksum?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await params.emitter.emitPipelineEvent({
      event: createPipelineEvent({
        session_id: params.session_id,
        pipeline_type: params.pipeline_type,
        step: params.step,
        status: params.status,
        sequence: params.sequence,
        handler: params.handler,
        input_checksum: params.input_checksum,
        output_checksum: params.output_checksum,
        duration_ms: params.duration_ms,
        error: params.error,
        metadata: params.metadata,
      }),
    });
  } catch {
    // Best-effort emission; tracing should not alter runtime behavior.
  }
}

export function tracedStep<A, E>(params: TracedStepParams<A, E>): Effect.Effect<A, E> {
  const emitter = params.emitter ?? new PipelineEmitter();
  const start = nowMs();

  return Effect.tapBoth(params.effect, {
    onFailure: (error) =>
      Effect.promise(async () => {
        const inputChecksum =
          params.input === undefined
            ? undefined
            : await computeInputChecksum({ data: params.input });
        const duration = Math.max(0, nowMs() - start);
        const message = error instanceof Error ? error.message : String(error);

        await emitSafe({
          emitter,
          session_id: params.session_id,
          pipeline_type: params.pipeline_type,
          step: params.step,
          handler: params.handler,
          status: "failure",
          sequence: params.sequence,
          input_checksum: inputChecksum,
          duration_ms: duration,
          error: message,
          metadata: params.metadata,
        });
      }),
    onSuccess: (output) =>
      Effect.promise(async () => {
        const inputChecksum =
          params.input === undefined
            ? undefined
            : await computeInputChecksum({ data: params.input });
        const outputChecksum = await computeOutputChecksum({ data: output });
        const duration = Math.max(0, nowMs() - start);

        await emitSafe({
          emitter,
          session_id: params.session_id,
          pipeline_type: params.pipeline_type,
          step: params.step,
          handler: params.handler,
          status: "success",
          sequence: params.sequence,
          input_checksum: inputChecksum,
          output_checksum: outputChecksum,
          duration_ms: duration,
          metadata: params.metadata,
        });
      }),
  });
}
