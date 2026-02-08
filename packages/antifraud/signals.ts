// LEGEND: Signal collectors — functions that analyze checkout data and emit RiskSignals
// Each collector focuses on one fraud vector and returns a normalized RiskSignal
// All usage must comply with this LEGEND and the LICENSE

import type { PipelineEvent } from "../pipeline/event";
import {
    CHECKOUT_TOO_FAST_MS,
    CHECKOUT_TOO_SLOW_MS,
    DEFAULT_SIGNAL_WEIGHTS,
} from "./constants";
import type { DeviceFingerprint, RiskSignal } from "./schemas";
import { getVelocityThreshold, type VelocityStorage } from "./velocity-store";

/* ── Velocity Signal Collector ───────────────────────────── */

/** Check session frequency per key — flags high-velocity actors */
export async function collectVelocitySignals(params: {
  session_id: string;
  email?: string;
  ip?: string;
  device_hash?: string;
  velocityStore: VelocityStorage;
}): Promise<RiskSignal[]> {
  const signals: RiskSignal[] = [];
  const { session_id, velocityStore } = params;

  const checks: Array<{ key?: string; key_type: "email" | "ip" | "device"; signal: string }> = [
    { key: params.email, key_type: "email", signal: "velocity_email" },
    { key: params.ip, key_type: "ip", signal: "velocity_ip" },
    { key: params.device_hash, key_type: "device", signal: "velocity_device" },
  ];

  for (const check of checks) {
    if (!check.key) continue;

    // Record this session
    await velocityStore.record({
      key: check.key,
      key_type: check.key_type,
      session_id,
    });

    // Check current count
    const record = await velocityStore.get({
      key: check.key,
      key_type: check.key_type,
    });

    if (record) {
      const threshold = getVelocityThreshold({ key_type: check.key_type });
      if (record.count > threshold) {
        const overage = record.count - threshold;
        const score = Math.min(100, 20 + overage * 15);

        signals.push({
          signal: check.signal,
          score,
          weight: DEFAULT_SIGNAL_WEIGHTS[check.signal] ?? 1.0,
          reason: `${check.key_type} "${check.key}" has ${record.count} sessions in window (threshold: ${threshold})`,
          metadata: {
            key: check.key,
            key_type: check.key_type,
            count: record.count,
            threshold,
          },
        });
      }
    }
  }

  return signals;
}

/* ── Timing Anomaly Collector ────────────────────────────── */

/** Analyze checkout duration — too fast = bot, too slow = hijack */
export function collectTimingSignals(params: {
  events: PipelineEvent[];
}): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { events } = params;

  if (events.length < 2) return signals;

  // Sort by timestamp
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const firstTs = new Date(sorted[0].timestamp).getTime();
  const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const durationMs = lastTs - firstTs;

  if (durationMs < CHECKOUT_TOO_FAST_MS) {
    signals.push({
      signal: "timing_too_fast",
      score: Math.min(100, 60 + Math.round((1 - durationMs / CHECKOUT_TOO_FAST_MS) * 40)),
      weight: DEFAULT_SIGNAL_WEIGHTS.timing_too_fast ?? 1.0,
      reason: `Checkout completed in ${durationMs}ms (threshold: ${CHECKOUT_TOO_FAST_MS}ms) — possible bot`,
      metadata: { duration_ms: durationMs, threshold_ms: CHECKOUT_TOO_FAST_MS },
    });
  }

  if (durationMs > CHECKOUT_TOO_SLOW_MS) {
    signals.push({
      signal: "timing_too_slow",
      score: Math.min(100, 30 + Math.round(((durationMs - CHECKOUT_TOO_SLOW_MS) / CHECKOUT_TOO_SLOW_MS) * 30)),
      weight: DEFAULT_SIGNAL_WEIGHTS.timing_too_slow ?? 1.0,
      reason: `Checkout took ${Math.round(durationMs / 1000)}s (threshold: ${CHECKOUT_TOO_SLOW_MS / 1000}s) — possible session hijack`,
      metadata: { duration_ms: durationMs, threshold_ms: CHECKOUT_TOO_SLOW_MS },
    });
  }

  return signals;
}

/* ── Chain Hash Mutation Collector ────────────────────────── */

/** Detect if the chain hash changed mid-checkout — indicates input tampering */
export function collectChainHashMutationSignals(params: {
  previous_chain_hash?: string;
  current_chain_hash: string;
  events: PipelineEvent[];
}): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (params.previous_chain_hash && params.previous_chain_hash !== params.current_chain_hash) {
    signals.push({
      signal: "chain_hash_mutation",
      score: 80,
      weight: DEFAULT_SIGNAL_WEIGHTS.chain_hash_mutation ?? 1.0,
      reason: "Chain hash changed mid-checkout — input data was mutated after initial validation",
      metadata: {
        previous_hash: params.previous_chain_hash,
        current_hash: params.current_chain_hash,
        event_count: params.events.length,
      },
    });
  }

  return signals;
}

/* ── Input Mutation Collector ────────────────────────────── */

/** Detect if buyer changed critical fields (email, name) between pipeline steps */
export function collectInputMutationSignals(params: {
  events: PipelineEvent[];
}): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const { events } = params;

  // Find buyer_validated events — if multiple exist with different input checksums, flag it
  const buyerEvents = events
    .filter((e) => e.step === "buyer_validated" && e.input_checksum)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (buyerEvents.length >= 2) {
    const uniqueChecksums = new Set(buyerEvents.map((e) => e.input_checksum));
    if (uniqueChecksums.size > 1) {
      signals.push({
        signal: "input_mutation",
        score: 50,
        weight: DEFAULT_SIGNAL_WEIGHTS.input_mutation ?? 1.0,
        reason: `Buyer data changed ${uniqueChecksums.size} times during checkout — possible session manipulation`,
        metadata: {
          mutation_count: uniqueChecksums.size,
          checksums: Array.from(uniqueChecksums),
        },
      });
    }
  }

  return signals;
}

/* ── Geo Mismatch Collector ──────────────────────────────── */

/** Compare billing country to inferred IP country */
export function collectGeoMismatchSignals(params: {
  billing_country?: string;
  ip_country?: string;
}): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (
    params.billing_country &&
    params.ip_country &&
    params.billing_country.toUpperCase() !== params.ip_country.toUpperCase()
  ) {
    signals.push({
      signal: "geo_mismatch",
      score: 40,
      weight: DEFAULT_SIGNAL_WEIGHTS.geo_mismatch ?? 1.0,
      reason: `Billing country (${params.billing_country}) does not match IP country (${params.ip_country})`,
      metadata: {
        billing_country: params.billing_country,
        ip_country: params.ip_country,
      },
    });
  }

  return signals;
}

/* ── Device Anomaly Collector ────────────────────────────── */

/** Detect suspicious device fingerprint characteristics */
export function collectDeviceAnomalySignals(params: {
  fingerprint?: DeviceFingerprint;
}): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const fp = params.fingerprint;
  if (!fp) return signals;

  const anomalies: string[] = [];

  // Headless browser indicators
  if (fp.webgl_renderer && /swiftshader|mesa|llvmpipe/i.test(fp.webgl_renderer)) {
    anomalies.push(`Suspicious WebGL renderer: ${fp.webgl_renderer}`);
  }

  // Zero touch points on mobile UA
  if (fp.user_agent && /mobile|android|iphone/i.test(fp.user_agent) && fp.max_touch_points === 0) {
    anomalies.push("Mobile user agent but zero touch points — emulated device");
  }

  // Plugins disabled (common in automation)
  if (fp.plugin_count === 0 && fp.user_agent && !/firefox/i.test(fp.user_agent)) {
    anomalies.push("No browser plugins detected — possible headless browser");
  }

  // Suspiciously high hardware concurrency (server-side headless)
  if (fp.hardware_concurrency && fp.hardware_concurrency > 32) {
    anomalies.push(`Unusual hardware concurrency: ${fp.hardware_concurrency}`);
  }

  if (anomalies.length > 0) {
    signals.push({
      signal: "device_anomaly",
      score: Math.min(100, 20 + anomalies.length * 20),
      weight: DEFAULT_SIGNAL_WEIGHTS.device_anomaly ?? 1.0,
      reason: anomalies.join("; "),
      metadata: {
        anomalies,
        fingerprint: fp,
      },
    });
  }

  return signals;
}
