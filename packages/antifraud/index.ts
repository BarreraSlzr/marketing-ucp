// LEGEND: Antifraud barrel exports — public API for @repo/antifraud
// Risk scoring engine, signal collectors, velocity store, and schemas
// All usage must comply with this LEGEND and the LICENSE

/* ── Constants ───────────────────────────────────────────── */
export {
    ALLOW_THRESHOLD,
    BLOCK_THRESHOLD,
    CHECKOUT_TOO_FAST_MS,
    CHECKOUT_TOO_SLOW_MS,
    DEFAULT_SIGNAL_WEIGHTS,
    VELOCITY_MAX_SESSIONS_PER_DEVICE,
    VELOCITY_MAX_SESSIONS_PER_EMAIL,
    VELOCITY_MAX_SESSIONS_PER_IP,
    VELOCITY_WINDOW_MS
} from "./constants";

/* ── Schemas & Types ─────────────────────────────────────── */
export {
    DeviceFingerprintSchema,
    FraudCheckMetadataSchema,
    MerchantFeedbackSchema,
    RiskAssessmentSchema,
    RiskDecisionSchema,
    RiskSignalSchema,
    VelocityRecordSchema,
    type DeviceFingerprint,
    type FraudCheckMetadata,
    type MerchantFeedback,
    type RiskAssessment,
    type RiskDecision,
    type RiskSignal,
    type VelocityRecord
} from "./schemas";

/* ── Risk Scoring Engine ─────────────────────────────────── */
export {
    assessRisk,
    type AssessmentConfig,
    type AssessmentInput
} from "./risk-engine";

/* ── Signal Collectors ───────────────────────────────────── */
export {
    collectChainHashMutationSignals,
    collectDeviceAnomalySignals,
    collectGeoMismatchSignals,
    collectInputMutationSignals,
    collectTimingSignals,
    collectVelocitySignals
} from "./signals";

/* ── Velocity Store ──────────────────────────────────────── */
export {
    getVelocityThreshold, InMemoryVelocityStorage,
    VercelKvVelocityStorage, type VelocityStorage
} from "./velocity-store";

