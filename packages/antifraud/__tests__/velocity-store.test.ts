// LEGEND: Velocity store tests — validates in-memory velocity tracking and window eviction
// All usage must comply with this LEGEND and the LICENSE

import { beforeEach, describe, expect, it } from "bun:test";
import { InMemoryVelocityStorage, getVelocityThreshold } from "../velocity-store";

describe("InMemoryVelocityStorage", () => {
  let store: InMemoryVelocityStorage;

  beforeEach(() => {
    store = new InMemoryVelocityStorage({ windowMs: 5_000 }); // 5s window for testing
  });

  it("records and retrieves a session", async () => {
    await store.record({ key: "user@example.com", key_type: "email", session_id: "s1" });

    const record = await store.get({ key: "user@example.com", key_type: "email" });
    expect(record).not.toBeNull();
    expect(record!.count).toBe(1);
    expect(record!.session_ids).toContain("s1");
  });

  it("deduplicates sessions", async () => {
    await store.record({ key: "user@example.com", key_type: "email", session_id: "s1" });
    await store.record({ key: "user@example.com", key_type: "email", session_id: "s1" });

    const record = await store.get({ key: "user@example.com", key_type: "email" });
    expect(record!.count).toBe(1);
  });

  it("counts multiple sessions", async () => {
    for (let i = 0; i < 5; i++) {
      await store.record({ key: "user@example.com", key_type: "email", session_id: `s${i}` });
    }

    const record = await store.get({ key: "user@example.com", key_type: "email" });
    expect(record!.count).toBe(5);
  });

  it("returns null for unknown key", async () => {
    const record = await store.get({ key: "unknown@example.com", key_type: "email" });
    expect(record).toBeNull();
  });

  it("separates key types", async () => {
    await store.record({ key: "user@example.com", key_type: "email", session_id: "s1" });
    await store.record({ key: "user@example.com", key_type: "ip", session_id: "s2" });

    const emailRecord = await store.get({ key: "user@example.com", key_type: "email" });
    const ipRecord = await store.get({ key: "user@example.com", key_type: "ip" });

    expect(emailRecord!.count).toBe(1);
    expect(ipRecord!.count).toBe(1);
  });

  it("prunes expired entries", async () => {
    // Use a very short window
    const shortStore = new InMemoryVelocityStorage({ windowMs: 50 });
    await shortStore.record({ key: "user@example.com", key_type: "email", session_id: "s1" });

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 100));

    const pruned = await shortStore.prune();
    expect(pruned).toBeGreaterThanOrEqual(1);

    const record = await shortStore.get({ key: "user@example.com", key_type: "email" });
    expect(record).toBeNull();
  });
});

describe("getVelocityThreshold", () => {
  it("returns correct thresholds for each key type", () => {
    expect(getVelocityThreshold({ key_type: "email" })).toBe(5);
    expect(getVelocityThreshold({ key_type: "ip" })).toBe(10);
    expect(getVelocityThreshold({ key_type: "device" })).toBe(8);
  });
});
