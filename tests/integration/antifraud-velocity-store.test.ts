import {
    getSharedVelocityStore,
    resetSharedVelocityStore,
} from "@/lib/antifraud-velocity-store";
import { assessRisk } from "@repo/antifraud";
import type { PipelineEvent } from "@repo/pipeline/event";
import { beforeEach, describe, expect, it } from "bun:test";

describe("Antifraud VelocityStore singleton", () => {
  beforeEach(() => {
    resetSharedVelocityStore();
  });

  it("accumulates velocity signals across assessments", async () => {
    const velocityStore = getSharedVelocityStore();
    const email = "repeat@example.com";
    const deviceHash = "device-repeat";

    const first = await assessRisk({
      input: {
        session_id: "velocity-singleton-1",
        events: [] as PipelineEvent[],
        email,
        device_hash: deviceHash,
        ip: "192.168.1.10",
      },
      config: { velocityStore },
    });

    const second = await assessRisk({
      input: {
        session_id: "velocity-singleton-2",
        events: [] as PipelineEvent[],
        email,
        device_hash: deviceHash,
        ip: "192.168.1.10",
      },
      config: { velocityStore },
    });

    const firstVelocity = first.signals.filter((signal) =>
      signal.name?.includes("velocity")
    );
    const secondVelocity = second.signals.filter((signal) =>
      signal.name?.includes("velocity")
    );

    expect(firstVelocity.length).toBe(0);
    expect(secondVelocity.length).toBeGreaterThan(0);
  });
});
