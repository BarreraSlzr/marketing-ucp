// LEGEND: Pipeline barrel exports — public API for @repo/pipeline
// Runtime observability core: events, checksums, registry, emitter, and coordinate system
// All usage must comply with this LEGEND and the LICENSE

/* ── Constants & Constraints ─────────────────────────────── */
export {
    CHECKSUM_LENGTH,
    CHECKSUM_PATTERN,
    ChecksumHexSchema,
    MAX_SEQUENCE,
    NESTED_DELIMITER,
    PipelineTypeSchema,
    SESSION_ID_MAX_LENGTH,
    SESSION_ID_PATTERN,
    SessionIdSchema,
    type PipelineType
} from "./constants";

/* ── Event ID (Coordinate System) ────────────────────────── */
export {
    EventIdSchema,
    createEventId,
    parseEventId,
    type EventId,
    type ParsedEventId
} from "./event-id";

/* ── Event ───────────────────────────────────────────────── */
export {
    PipelineEventSchema,
    PipelineEventStatusSchema,
    PipelineStepSchema,
    createPipelineEvent,
    type PipelineEvent,
    type PipelineEventStatus,
    type PipelineStep
} from "./event";

/* ── Checksum ────────────────────────────────────────────── */
export {
    PipelineChecksumSchema,
    PipelineReceiptEntrySchema,
    PipelineReceiptSchema,
    computeChainHash,
    computeDataChecksum,
    computePipelineChecksum,
    computePipelineReceipt,
    computeStepHash,
    type PipelineChecksum,
    type PipelineReceipt,
    type PipelineReceiptEntry
} from "./checksum";

/* ── Checksum Utils ─────────────────────────────────────── */
export {
    computeInputChecksum,
    computeOutputChecksum
} from "./checksum-utils";

/* ── Registry ────────────────────────────────────────────── */
export {
    PIPELINE_CHECKOUT_DIGITAL,
    PIPELINE_CHECKOUT_DIGITAL_ANTIFRAUD,
    PIPELINE_CHECKOUT_PHYSICAL,
    PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD,
    PIPELINE_CHECKOUT_SUBSCRIPTION,
    PIPELINE_CHECKOUT_SUBSCRIPTION_ANTIFRAUD,
    PIPELINE_DEFINITIONS,
    getPipelineDefinition,
    type PipelineDefinition
} from "./registry";

/* ── Emitter ─────────────────────────────────────────────── */
export {
    InMemoryPipelineStorage,
    PipelineEmitter,
    type PipelineStorage
} from "./emitter";

/* ── Registry Entry ──────────────────────────────────────── */
export {
    ChecksumRegistryEntrySchema,
    InMemoryChecksumRegistryStorage,
    createChecksumRegistryEntry,
    type ChecksumRegistryEntry,
    type ChecksumRegistryStorage
} from "./registry-entry";

/* ── KV Storage Helpers ─────────────────────────────────── */
export {
    VercelKvChecksumRegistryStorage, VercelKvPipelineStorage, getStoredSessionIds,
    storeSessionId
} from "./kv-storage";

/* ── Tracker ─────────────────────────────────────────────── */
export {
    PipelineTracker,
    type PipelineTrackerConfig
} from "./tracker";

/* ── Traced Effect ───────────────────────────────────────── */
export {
    tracedStep,
    type TracedStepParams
} from "./traced-effect";

/* ── Handler Health ─────────────────────────────────────── */
export {
    computeHandlerHealth,
    type HandlerHealth,
    type HandlerHealthStatus
} from "./health";

