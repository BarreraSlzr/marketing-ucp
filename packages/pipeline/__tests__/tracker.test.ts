import { beforeEach, describe, expect, test } from "bun:test";
import {
  ChecksumRegistryEntrySchema,
  InMemoryChecksumRegistryStorage,
  createChecksumRegistryEntry,
  type ChecksumRegistryEntry,
} from "../registry-entry";
import { PipelineTracker } from "../tracker";
import { createPipelineEvent } from "../event";
import {
  PIPELINE_CHECKOUT_DIGITAL,
  PIPELINE_CHECKOUT_PHYSICAL,
} from "../registry";

/* ══════════════════════════════════════════════════════════ *
 *  Checksum Registry Entry                                  *
 * ══════════════════════════════════════════════════════════ */

describe("ChecksumRegistryEntry", () => {
  test("createChecksumRegistryEntry generates valid entry", () => {
    const entry = createChecksumRegistryEntry({
      session_id: "chk_001",
      pipeline_type: "checkout_digital",
      chain_hash: "a".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
      notes: "Test entry",
    });

    expect(entry.id).toContain("reg_chk_001");
    expect(entry.session_id).toBe("chk_001");
    expect(entry.pipeline_type).toBe("checkout_digital");
    expect(entry.chain_hash).toBe("a".repeat(64));
    expect(entry.steps_expected).toBe(4);
    expect(entry.steps_completed).toBe(2);
    expect(entry.steps_failed).toBe(0);
    expect(entry.is_valid).toBe(false);
    expect(entry.notes).toBe("Test entry");
    expect(entry.created_at).toBeTruthy();
  });

  test("ChecksumRegistryEntrySchema validates valid entry", () => {
    const entry = createChecksumRegistryEntry({
      session_id: "chk_test",
      pipeline_type: "checkout_physical",
      chain_hash: "b".repeat(64),
      steps_expected: 6,
      steps_completed: 6,
      steps_failed: 0,
      is_valid: true,
    });

    const result = ChecksumRegistryEntrySchema.safeParse(entry);
    expect(result.success).toBe(true);
  });

  test("ChecksumRegistryEntrySchema rejects invalid chain_hash", () => {
    const result = ChecksumRegistryEntrySchema.safeParse({
      id: "reg_001",
      session_id: "chk_001",
      pipeline_type: "checkout_digital",
      chain_hash: "invalid",
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
      created_at: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });

  test("entry includes optional event_ids", () => {
    const entry = createChecksumRegistryEntry({
      session_id: "chk_002",
      pipeline_type: "checkout_digital",
      chain_hash: "c".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
      event_ids: ["chk_002.checkout_digital.buyer_validated.0"],
    });

    expect(entry.event_ids).toEqual([
      "chk_002.checkout_digital.buyer_validated.0",
    ]);
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  In-Memory Registry Storage                               *
 * ══════════════════════════════════════════════════════════ */

describe("InMemoryChecksumRegistryStorage", () => {
  let storage: InMemoryChecksumRegistryStorage;

  beforeEach(() => {
    storage = new InMemoryChecksumRegistryStorage();
  });

  test("stores and retrieves entries by session_id", () => {
    const entry = createChecksumRegistryEntry({
      session_id: "chk_storage",
      pipeline_type: "checkout_digital",
      chain_hash: "d".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
    });

    storage.store({ entry });
    const retrieved = storage.getBySessionId({ session_id: "chk_storage" });

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].session_id).toBe("chk_storage");
  });

  test("returns entries sorted by created_at (newest first)", async () => {
    const entry1 = createChecksumRegistryEntry({
      session_id: "chk_sort",
      pipeline_type: "checkout_digital",
      chain_hash: "e".repeat(64),
      steps_expected: 4,
      steps_completed: 1,
      steps_failed: 0,
      is_valid: false,
    });

    // Wait a bit to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));

    const entry2 = createChecksumRegistryEntry({
      session_id: "chk_sort",
      pipeline_type: "checkout_digital",
      chain_hash: "f".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
    });

    storage.store({ entry: entry1 });
    storage.store({ entry: entry2 });

    const retrieved = storage.getBySessionId({ session_id: "chk_sort" });
    expect(retrieved.length).toBe(2);
    expect(retrieved[0].steps_completed).toBe(2); // entry2 is newer
    expect(retrieved[1].steps_completed).toBe(1); // entry1 is older
  });

  test("getLatestBySessionId returns most recent entry", async () => {
    const entry1 = createChecksumRegistryEntry({
      session_id: "chk_latest",
      pipeline_type: "checkout_digital",
      chain_hash: "0".repeat(64),
      steps_expected: 4,
      steps_completed: 1,
      steps_failed: 0,
      is_valid: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const entry2 = createChecksumRegistryEntry({
      session_id: "chk_latest",
      pipeline_type: "checkout_digital",
      chain_hash: "1".repeat(64),
      steps_expected: 4,
      steps_completed: 3,
      steps_failed: 0,
      is_valid: false,
    });

    storage.store({ entry: entry1 });
    storage.store({ entry: entry2 });

    const latest = storage.getLatestBySessionId({ session_id: "chk_latest" });
    expect(latest).not.toBeNull();
    expect(latest!.steps_completed).toBe(3);
  });

  test("getLatestBySessionId returns null for unknown session", () => {
    const latest = storage.getLatestBySessionId({ session_id: "nonexistent" });
    expect(latest).toBeNull();
  });

  test("clear removes all entries", () => {
    const entry = createChecksumRegistryEntry({
      session_id: "chk_clear",
      pipeline_type: "checkout_digital",
      chain_hash: "2".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
    });

    storage.store({ entry });
    storage.clear();

    const retrieved = storage.getBySessionId({ session_id: "chk_clear" });
    expect(retrieved.length).toBe(0);
  });

  test("isolates entries by session_id", () => {
    const entry1 = createChecksumRegistryEntry({
      session_id: "chk_a",
      pipeline_type: "checkout_digital",
      chain_hash: "3".repeat(64),
      steps_expected: 4,
      steps_completed: 2,
      steps_failed: 0,
      is_valid: false,
    });

    const entry2 = createChecksumRegistryEntry({
      session_id: "chk_b",
      pipeline_type: "checkout_digital",
      chain_hash: "4".repeat(64),
      steps_expected: 4,
      steps_completed: 3,
      steps_failed: 0,
      is_valid: false,
    });

    storage.store({ entry: entry1 });
    storage.store({ entry: entry2 });

    const retrievedA = storage.getBySessionId({ session_id: "chk_a" });
    const retrievedB = storage.getBySessionId({ session_id: "chk_b" });

    expect(retrievedA.length).toBe(1);
    expect(retrievedB.length).toBe(1);
    expect(retrievedA[0].steps_completed).toBe(2);
    expect(retrievedB[0].steps_completed).toBe(3);
  });
});

/* ══════════════════════════════════════════════════════════ *
 *  Pipeline Tracker                                         *
 * ══════════════════════════════════════════════════════════ */

describe("PipelineTracker", () => {
  let tracker: PipelineTracker;

  beforeEach(() => {
    tracker = new PipelineTracker();
  });

  test("trackEvent emits event and auto-snapshots when definition provided", async () => {
    const event = createPipelineEvent({
      session_id: "chk_track",
      pipeline_type: "checkout_digital",
      step: "buyer_validated",
      status: "success",
    });

    const result = await tracker.trackEvent({
      event,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    expect(result.event.step).toBe("buyer_validated");
    expect(result.snapshot).toBeDefined();
    expect(result.snapshot!.session_id).toBe("chk_track");
  });

  test("trackEvent without definition does not auto-snapshot", async () => {
    const event = createPipelineEvent({
      session_id: "chk_no_snap",
      pipeline_type: "checkout_digital",
      step: "buyer_validated",
      status: "success",
    });

    const result = await tracker.trackEvent({ event });

    expect(result.event.step).toBe("buyer_validated");
    expect(result.snapshot).toBeUndefined();
  });

  test("getEvents retrieves all events for a session", async () => {
    const sessionId = "chk_get_events";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
    });

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "payment_initiated",
        status: "success",
      }),
    });

    const events = await tracker.getEvents({ session_id: sessionId });
    expect(events.length).toBe(2);
  });

  test("snapshotChecksum creates registry entry", async () => {
    const sessionId = "chk_snapshot";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
    });

    const snapshot = await tracker.snapshotChecksum({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
      notes: "Manual snapshot",
    });

    expect(snapshot.session_id).toBe(sessionId);
    expect(snapshot.notes).toBe("Manual snapshot");
    expect(snapshot.event_ids).toBeDefined();
  });

  test("getCurrentChecksum computes without storing", async () => {
    const sessionId = "chk_current";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
    });

    const checksum = await tracker.getCurrentChecksum({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    expect(checksum.session_id).toBe(sessionId);
    expect(checksum.steps_completed).toBe(1);

    // Verify no registry entry was created
    const history = await tracker.getRegistryHistory({ session_id: sessionId });
    expect(history.length).toBe(0);
  });

  test("getRegistryHistory returns all snapshots sorted newest first", async () => {
    const sessionId = "chk_history";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "payment_initiated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    const history = await tracker.getRegistryHistory({ session_id: sessionId });
    expect(history.length).toBe(2);
    expect(history[0].steps_completed).toBeGreaterThan(
      history[1].steps_completed
    );
  });

  test("getLatestSnapshot returns most recent registry entry", async () => {
    const sessionId = "chk_latest_snap";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "payment_initiated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    const latest = await tracker.getLatestSnapshot({ session_id: sessionId });
    expect(latest).not.toBeNull();
    expect(latest!.steps_completed).toBe(2);
  });

  test("getStatusSummary provides complete overview", async () => {
    const sessionId = "chk_summary";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "payment_initiated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    const summary = await tracker.getStatusSummary({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    expect(summary.session_id).toBe(sessionId);
    expect(summary.pipeline_type).toBe("checkout_digital");
    expect(summary.events.length).toBe(2);
    expect(summary.current_checksum.steps_completed).toBe(2);
    expect(summary.latest_snapshot).not.toBeNull();
    expect(summary.registry_history.length).toBe(2);
  });

  test("generateIssueReport identifies failed and missing steps", async () => {
    const sessionId = "chk_issue";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_physical",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_PHYSICAL,
    });

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_physical",
        step: "address_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_PHYSICAL,
    });

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_physical",
        step: "payment_initiated",
        status: "failure",
        error: "Payment gateway timeout",
      }),
      definition: PIPELINE_CHECKOUT_PHYSICAL,
    });

    const report = await tracker.generateIssueReport({
      session_id: sessionId,
      definition: PIPELINE_CHECKOUT_PHYSICAL,
    });

    expect(report.session_id).toBe(sessionId);
    expect(report.is_valid).toBe(false);
    expect(report.failed_steps).toContain("payment_initiated");
    expect(report.missing_steps.length).toBeGreaterThan(0);
    expect(report.events.length).toBe(3);
    expect(report.report_generated_at).toBeTruthy();
  });

  test("disabling autoSnapshot prevents automatic registry entries", async () => {
    const trackerNoAuto = new PipelineTracker({ autoSnapshot: false });
    const sessionId = "chk_no_auto";

    await trackerNoAuto.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    const history = await trackerNoAuto.getRegistryHistory({
      session_id: sessionId,
    });
    expect(history.length).toBe(0);
  });

  test("clear removes all events and registry entries", async () => {
    const sessionId = "chk_clear_all";

    await tracker.trackEvent({
      event: createPipelineEvent({
        session_id: sessionId,
        pipeline_type: "checkout_digital",
        step: "buyer_validated",
        status: "success",
      }),
      definition: PIPELINE_CHECKOUT_DIGITAL,
    });

    await tracker.clear();

    const events = await tracker.getEvents({ session_id: sessionId });
    const history = await tracker.getRegistryHistory({ session_id: sessionId });

    expect(events.length).toBe(0);
    expect(history.length).toBe(0);
  });
});
