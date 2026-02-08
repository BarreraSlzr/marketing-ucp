// LEGEND: Antifraud constants — thresholds, time windows, and scoring weights
// Centralizes all tunable parameters for the risk scoring engine
// All usage must comply with this LEGEND and the LICENSE

/* ── Risk Decision Thresholds ────────────────────────────── */

/** Scores below this are "allow" */
export const ALLOW_THRESHOLD = 30;

/** Scores above this are "block". Between ALLOW and BLOCK is "review" */
export const BLOCK_THRESHOLD = 70;

/* ── Velocity Check Defaults ─────────────────────────────── */

/** Default time window for velocity checks (ms) — 15 minutes */
export const VELOCITY_WINDOW_MS = 15 * 60 * 1_000;

/** Max sessions per email in the velocity window before flagging */
export const VELOCITY_MAX_SESSIONS_PER_EMAIL = 5;

/** Max sessions per IP in the velocity window before flagging */
export const VELOCITY_MAX_SESSIONS_PER_IP = 10;

/** Max sessions per device fingerprint in the velocity window */
export const VELOCITY_MAX_SESSIONS_PER_DEVICE = 8;

/* ── Timing Anomaly Defaults ─────────────────────────────── */

/** Checkout completed in under this many ms is suspicious (bot) */
export const CHECKOUT_TOO_FAST_MS = 3_000;

/** Checkout taking longer than this is suspicious (session hijack) */
export const CHECKOUT_TOO_SLOW_MS = 30 * 60 * 1_000;

/* ── Signal Weights (default) ────────────────────────────── */

export const DEFAULT_SIGNAL_WEIGHTS: Record<string, number> = {
  velocity_email: 1.0,
  velocity_ip: 0.8,
  velocity_device: 0.9,
  timing_too_fast: 1.2,
  timing_too_slow: 0.6,
  geo_mismatch: 1.0,
  chain_hash_mutation: 1.5,
  input_mutation: 1.0,
  device_anomaly: 0.7,
  form_pattern_anomaly: 0.5,
} as const;
