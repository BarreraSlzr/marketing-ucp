// LEGEND: Signal collector tests — validates velocity, timing, mutation, geo, and device signals
// All usage must comply with this LEGEND and the LICENSE

import { beforeEach, describe, expect, it } from "bun:test";
import type { PipelineEvent } from "../../pipeline/event";
import {
    collectChainHashMutationSignals,
    collectDeviceAnomalySignals,
    collectGeoMismatchSignals,
    collectInputMutationSignals,
    collectTimingSignals,
    collectVelocitySignals,
} from "../signals";
import { InMemoryVelocityStorage } from "../velocity-store";

/* ── Helpers ─────────────────────────────────────────────── */

function makeEvent(params: {
  step: string;
  timestamp: string;
  status?: string;
  input_checksum?: string;
}): PipelineEvent {
  return {
    id: `sess.checkout_physical.${params.step}.0`,
    session_id: "sess_001",
    pipeline_type: "checkout_physical",
    step: params.step,
    sequence: 0,
    status: params.status ?? "success",
    timestamp: params.timestamp,
    input_checksum: params.input_checksum,
  } as PipelineEvent;
}

/* ── Velocity Signals ────────────────────────────────────── */

describe("collectVelocitySignals", () => {
  let store: InMemoryVelocityStorage;

  beforeEach(() => {
    store = new InMemoryVelocityStorage({ windowMs: 60_000 });
  });

  it("returns no signals for first session", async () => {
    const signals = await collectVelocitySignals({
      session_id: "sess_001",
      email: "user@example.com",
      velocityStore: store,
    });
    expect(signals).toHaveLength(0);
  });

  it("flags high email velocity", async () => {
    // Record 6 sessions (threshold is 5)
    for (let i = 0; i < 6; i++) {
      await store.record({
        key: "user@example.com",
        key_type: "email",
        session_id: `sess_${i}`,
      });
    }

    const signals = await collectVelocitySignals({
      session_id: "sess_6",
      email: "user@example.com",
      velocityStore: store,
    });

    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].signal).toBe("velocity_email");
  });

  it("does not flag velocity under threshold", async () => {
    // Record 3 sessions (threshold is 5)
    for (let i = 0; i < 3; i++) {
      await store.record({
        key: "user@example.com",
        key_type: "email",
        session_id: `sess_${i}`,
      });
    }

    const signals = await collectVelocitySignals({
      session_id: "sess_3",
      email: "user@example.com",
      velocityStore: store,
    });

    expect(signals).toHaveLength(0);
  });
});

/* ── Timing Signals ──────────────────────────────────────── */

describe("collectTimingSignals", () => {
  it("returns no signals for normal timing", () => {
    const now = Date.now();
    const signals = collectTimingSignals({
      events: [
        makeEvent({ step: "buyer_validated", timestamp: new Date(now).toISOString() }),
        makeEvent({ step: "checkout_completed", timestamp: new Date(now + 60_000).toISOString() }),
      ],
    });
    expect(signals).toHaveLength(0);
  });

  it("flags too-fast checkout (bot)", () => {
    const now = Date.now();
    const signals = collectTimingSignals({
      events: [
        makeEvent({ step: "buyer_validated", timestamp: new Date(now).toISOString() }),
        makeEvent({ step: "checkout_completed", timestamp: new Date(now + 1_000).toISOString() }),
      ],
    });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].signal).toBe("timing_too_fast");
  });

  it("flags too-slow checkout (session hijack)", () => {
    const now = Date.now();
    const signals = collectTimingSignals({
      events: [
        makeEvent({ step: "buyer_validated", timestamp: new Date(now).toISOString() }),
        makeEvent({
          step: "checkout_completed",
          timestamp: new Date(now + 45 * 60 * 1000).toISOString(),
        }),
      ],
    });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].signal).toBe("timing_too_slow");
  });

  it("returns no signals for single event", () => {
    const signals = collectTimingSignals({
      events: [makeEvent({ step: "buyer_validated", timestamp: new Date().toISOString() })],
    });
    expect(signals).toHaveLength(0);
  });
});

/* ── Chain Hash Mutation Signals ─────────────────────────── */

describe("collectChainHashMutationSignals", () => {
  it("returns no signals when hashes match", () => {
    const signals = collectChainHashMutationSignals({
      previous_chain_hash: "abc123",
      current_chain_hash: "abc123",
      events: [],
    });
    expect(signals).toHaveLength(0);
  });

  it("flags hash mutation", () => {
    const signals = collectChainHashMutationSignals({
      previous_chain_hash: "abc123",
      current_chain_hash: "def456",
      events: [],
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].signal).toBe("chain_hash_mutation");
    expect(signals[0].score).toBe(80);
  });

  it("returns no signals when no previous hash", () => {
    const signals = collectChainHashMutationSignals({
      previous_chain_hash: undefined,
      current_chain_hash: "abc123",
      events: [],
    });
    expect(signals).toHaveLength(0);
  });
});

/* ── Input Mutation Signals ──────────────────────────────── */

describe("collectInputMutationSignals", () => {
  it("returns no signals when buyer data is consistent", () => {
    const signals = collectInputMutationSignals({
      events: [
        makeEvent({
          step: "buyer_validated",
          timestamp: "2026-02-08T00:00:00.000Z",
          input_checksum: "aaaa",
        }),
      ],
    });
    expect(signals).toHaveLength(0);
  });

  it("flags buyer data mutation between attempts", () => {
    const signals = collectInputMutationSignals({
      events: [
        makeEvent({
          step: "buyer_validated",
          timestamp: "2026-02-08T00:00:00.000Z",
          input_checksum: "aaaa",
        }),
        makeEvent({
          step: "buyer_validated",
          timestamp: "2026-02-08T00:01:00.000Z",
          input_checksum: "bbbb",
        }),
      ],
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].signal).toBe("input_mutation");
  });
});

/* ── Geo Mismatch Signals ────────────────────────────────── */

describe("collectGeoMismatchSignals", () => {
  it("returns no signals when countries match", () => {
    const signals = collectGeoMismatchSignals({
      billing_country: "US",
      ip_country: "US",
    });
    expect(signals).toHaveLength(0);
  });

  it("flags country mismatch", () => {
    const signals = collectGeoMismatchSignals({
      billing_country: "US",
      ip_country: "RU",
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].signal).toBe("geo_mismatch");
  });

  it("case-insensitive comparison", () => {
    const signals = collectGeoMismatchSignals({
      billing_country: "us",
      ip_country: "US",
    });
    expect(signals).toHaveLength(0);
  });

  it("returns no signals when data missing", () => {
    const signals = collectGeoMismatchSignals({});
    expect(signals).toHaveLength(0);
  });
});

/* ── Device Anomaly Signals ──────────────────────────────── */

describe("collectDeviceAnomalySignals", () => {
  it("returns no signals for normal device", () => {
    const signals = collectDeviceAnomalySignals({
      fingerprint: {
        user_agent: "Mozilla/5.0 Chrome/120",
        webgl_renderer: "ANGLE (NVIDIA GeForce)",
        max_touch_points: 0,
        plugin_count: 3,
        hardware_concurrency: 8,
      },
    });
    expect(signals).toHaveLength(0);
  });

  it("flags headless browser WebGL renderer", () => {
    const signals = collectDeviceAnomalySignals({
      fingerprint: {
        webgl_renderer: "Google SwiftShader",
      },
    });
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].signal).toBe("device_anomaly");
  });

  it("flags mobile UA with zero touch points", () => {
    const signals = collectDeviceAnomalySignals({
      fingerprint: {
        user_agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)",
        max_touch_points: 0,
      },
    });
    expect(signals.length).toBeGreaterThan(0);
  });

  it("returns no signals without fingerprint", () => {
    const signals = collectDeviceAnomalySignals({});
    expect(signals).toHaveLength(0);
  });
});
