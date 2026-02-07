import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import { InMemoryPipelineStorage, PipelineEmitter } from "../emitter";
import { tracedStep } from "../traced-effect";

function makeEmitter() {
  const storage = new InMemoryPipelineStorage();
  const emitter = new PipelineEmitter({ storage });
  return { emitter, storage };
}

describe("tracedStep", () => {
  test("emits success event with checksums", async () => {
    const { emitter } = makeEmitter();
    const effect = Effect.succeed({ ok: true });

    const result = await Effect.runPromise(
      tracedStep({
        session_id: "chk_001",
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        handler: "zod",
        input: { email: "demo@example.com" },
        effect,
        emitter,
      })
    );

    expect(result).toEqual({ ok: true });

    const events = await emitter.getPipelineEvents({ session_id: "chk_001" });
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("success");
    expect(events[0].input_checksum).toBeTruthy();
    expect(events[0].output_checksum).toBeTruthy();
    expect(events[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  test("emits failure event with error", async () => {
    const { emitter } = makeEmitter();
    const effect = Effect.fail(new Error("boom"));

    const outcome = await Effect.runPromise(
      Effect.either(
        tracedStep({
          session_id: "chk_002",
          pipeline_type: "checkout_digital",
          step: "buyer_validated",
          handler: "zod",
          input: { email: "bad" },
          effect,
          emitter,
        })
      )
    );

    expect(outcome._tag).toBe("Left");

    const events = await emitter.getPipelineEvents({ session_id: "chk_002" });
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("failure");
    expect(events[0].error).toBe("boom");
  });

  test("emits timeout failure event", async () => {
    const { emitter } = makeEmitter();

    const effect = Effect.tryPromise({
      try: () =>
        Promise.race([
          new Promise((resolve) => setTimeout(() => resolve("ok"), 50)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), 10)
          ),
        ]),
      catch: (error) => error as Error,
    });

    const outcome = await Effect.runPromise(
      Effect.either(
        tracedStep({
          session_id: "chk_003",
          pipeline_type: "checkout_digital",
          step: "payment_initiated",
          handler: "form",
          input: { payment_handler: "demo" },
          effect,
          emitter,
        })
      )
    );

    expect(outcome._tag).toBe("Left");

    const events = await emitter.getPipelineEvents({ session_id: "chk_003" });
    expect(events.length).toBe(1);
    expect(events[0].status).toBe("failure");
    expect(events[0].error).toBe("timeout");
  });
});
