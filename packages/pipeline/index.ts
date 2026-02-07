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
    computeChainHash,
    computeDataChecksum,
    computePipelineChecksum,
    computeStepHash,
    type PipelineChecksum
} from "./checksum";

/* ── Registry ────────────────────────────────────────────── */
export {
    PIPELINE_CHECKOUT_DIGITAL,
    PIPELINE_CHECKOUT_PHYSICAL,
    PIPELINE_CHECKOUT_SUBSCRIPTION,
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

