import { describe, expect, mock, test } from "bun:test";

const ENV_KEYS = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "VERCEL"] as const;

type EnvSnapshot = Record<(typeof ENV_KEYS)[number], string | undefined>;

type EnvValues = Partial<EnvSnapshot>;

function captureEnv(): EnvSnapshot {
  return {
    KV_REST_API_URL: process.env.KV_REST_API_URL,
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    VERCEL: process.env.VERCEL,
  };
}

function applyEnv(values: EnvValues): void {
  ENV_KEYS.forEach((key) => {
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  });
}

describe("webhook idempotency", () => {
  test("stores ids in memory when KV is disabled", async () => {
    const snapshot = captureEnv();
    try {
      applyEnv({ KV_REST_API_URL: undefined, KV_REST_API_TOKEN: undefined, VERCEL: undefined });

      const { hasProcessedWebhookEvent, markWebhookEventProcessed } = await import(
        "../../lib/webhook-idempotency?test=memory"
      );

      expect(await hasProcessedWebhookEvent({ event_id: "evt_mem_001" })).toBe(false);
      await markWebhookEventProcessed({ event_id: "evt_mem_001" });
      expect(await hasProcessedWebhookEvent({ event_id: "evt_mem_001" })).toBe(true);
    } finally {
      applyEnv(snapshot);
    }
  });

  test("persists ids in KV across module reloads", async () => {
    const snapshot = captureEnv();
    const kvStore = new Map<string, string>();

    mock.module("@vercel/kv", () => ({
      kv: {
        get: async (key: string) => kvStore.get(key) ?? null,
        set: async (key: string, value: string) => {
          kvStore.set(key, value);
        },
      },
    }));

    try {
      applyEnv({
        KV_REST_API_URL: "https://kv.test",
        KV_REST_API_TOKEN: "token",
        VERCEL: "1",
      });

      const first = await import("../../lib/webhook-idempotency?test=kv1");
      expect(await first.hasProcessedWebhookEvent({ event_id: "evt_kv_001" })).toBe(false);
      await first.markWebhookEventProcessed({ event_id: "evt_kv_001" });

      const second = await import("../../lib/webhook-idempotency?test=kv2");
      expect(await second.hasProcessedWebhookEvent({ event_id: "evt_kv_001" })).toBe(true);
    } finally {
      applyEnv(snapshot);
    }
  });
});
