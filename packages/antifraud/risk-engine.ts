// LEGEND: Risk scoring engine — aggregates signals into a weighted RiskAssessment
// Orchestrates all signal collectors and computes the final allow/review/block decision
// All usage must comply with this LEGEND and the LICENSE

import { getIsoTimestamp } from "../../utils/stamp";
import type { PipelineEvent } from "../pipeline/event";
import { ALLOW_THRESHOLD, BLOCK_THRESHOLD } from "./constants";
import type { DeviceFingerprint, RiskAssessment, RiskDecision, RiskSignal } from "./schemas";
import { RiskAssessmentSchema } from "./schemas";
import {
    collectChainHashMutationSignals,
    collectDeviceAnomalySignals,
    collectGeoMismatchSignals,
    collectInputMutationSignals,
    collectTimingSignals,
    collectVelocitySignals,
} from "./signals";
import type { VelocityStorage } from "./velocity-store";

/* ── Assessment Configuration ────────────────────────────── */

export interface AssessmentConfig {
  /** Velocity storage backend */
  velocityStore: VelocityStorage;
  /** Override allow threshold */
  allowThreshold?: number;
  /** Override block threshold */
  blockThreshold?: number;
}

/* ── Assessment Input ────────────────────────────────────── */

export interface AssessmentInput {
  /** Checkout session ID */
  session_id: string;
  /** Pipeline events for this session */
  events: PipelineEvent[];
  /** Buyer email (for velocity checks) */
  email?: string;
  /** Client IP address (for velocity + geo checks) */
  ip?: string;
  /** Device fingerprint hash (for velocity checks) */
  device_hash?: string;
  /** Device fingerprint (for anomaly detection) */
  device_fingerprint?: DeviceFingerprint;
  /** Billing country code */
  billing_country?: string;
  /** IP-inferred country code */
  ip_country?: string;
  /** Previous chain hash (for mutation detection) */
  previous_chain_hash?: string;
  /** Current chain hash */
  current_chain_hash?: string;
  /** Additional custom signals from integrations */
  custom_signals?: RiskSignal[];
}

/* ── Risk Scoring Engine ─────────────────────────────────── */

/** Compute a weighted total score from risk signals */
function computeWeightedScore(params: { signals: RiskSignal[] }): number {
  if (params.signals.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const signal of params.signals) {
    const weight = signal.weight ?? 1.0;
    totalWeightedScore += signal.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  // Normalize to 0–100
  return Math.min(100, Math.round(totalWeightedScore / totalWeight));
}

/** Determine decision from score */
function decideFromScore(params: {
  score: number;
  allowThreshold: number;
  blockThreshold: number;
}): RiskDecision {
  if (params.score <= params.allowThreshold) return "allow";
  if (params.score >= params.blockThreshold) return "block";
  return "review";
}

/** Run all signal collectors and produce a full RiskAssessment */
export async function assessRisk(params: {
  input: AssessmentInput;
  config: AssessmentConfig;
}): Promise<RiskAssessment> {
  const { input, config } = params;
  const allSignals: RiskSignal[] = [];

  // 1. Velocity checks
  const velocitySignals = await collectVelocitySignals({
    session_id: input.session_id,
    email: input.email,
    ip: input.ip,
    device_hash: input.device_hash,
    velocityStore: config.velocityStore,
  });
  allSignals.push(...velocitySignals);

  // 2. Timing anomalies
  const timingSignals = collectTimingSignals({ events: input.events });
  allSignals.push(...timingSignals);

  // 3. Chain hash mutation
  if (input.current_chain_hash) {
    const mutationSignals = collectChainHashMutationSignals({
      previous_chain_hash: input.previous_chain_hash,
      current_chain_hash: input.current_chain_hash,
      events: input.events,
    });
    allSignals.push(...mutationSignals);
  }

  // 4. Input mutation
  const inputMutationSignals = collectInputMutationSignals({ events: input.events });
  allSignals.push(...inputMutationSignals);

  // 5. Geo mismatch
  const geoSignals = collectGeoMismatchSignals({
    billing_country: input.billing_country,
    ip_country: input.ip_country,
  });
  allSignals.push(...geoSignals);

  // 6. Device anomalies
  const deviceSignals = collectDeviceAnomalySignals({
    fingerprint: input.device_fingerprint,
  });
  allSignals.push(...deviceSignals);

  // 7. Custom signals from integrations
  if (input.custom_signals) {
    allSignals.push(...input.custom_signals);
  }

  // Compute weighted total
  const totalScore = computeWeightedScore({ signals: allSignals });
  const decision = decideFromScore({
    score: totalScore,
    allowThreshold: config.allowThreshold ?? ALLOW_THRESHOLD,
    blockThreshold: config.blockThreshold ?? BLOCK_THRESHOLD,
  });

  return RiskAssessmentSchema.parse({
    session_id: input.session_id,
    total_score: totalScore,
    decision,
    signals: allSignals,
    chain_hash: input.current_chain_hash,
    assessed_at: getIsoTimestamp(),
  });
}
