// LEGEND: Pipeline barrel exports — public API for @repo/pipeline
// Runtime observability core: events, checksums, registry, and emitter

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
    computeDataChecksum,
    computePipelineChecksum,
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

