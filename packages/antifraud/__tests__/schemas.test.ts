// LEGEND: Antifraud package tests — validates schemas, signals, risk engine, and velocity store
// All usage must comply with this LEGEND and the LICENSE

import { describe, expect, it } from "bun:test";
import {
    DeviceFingerprintSchema,
    FraudCheckMetadataSchema,
    MerchantFeedbackSchema,
    RiskAssessmentSchema,
    RiskSignalSchema,
    VelocityRecordSchema,
} from "../schemas";

describe("Antifraud Schemas", () => {
  describe("RiskSignalSchema", () => {
    it("accepts valid risk signal", () => {
      const signal = RiskSignalSchema.parse({
        signal: "velocity_email",
        score: 45,
        reason: "High velocity detected",
        weight: 1.0,
      });
      expect(signal.signal).toBe("velocity_email");
      expect(signal.score).toBe(45);
    });

    it("rejects score outside 0–100", () => {
      expect(() =>
        RiskSignalSchema.parse({ signal: "test", score: 150, reason: "bad" })
      ).toThrow();
    });

    it("rejects empty signal name", () => {
      expect(() =>
        RiskSignalSchema.parse({ signal: "", score: 50, reason: "test" })
      ).toThrow();
    });

    it("defaults weight to 1.0", () => {
      const signal = RiskSignalSchema.parse({
        signal: "test",
        score: 50,
        reason: "test reason",
      });
      expect(signal.weight).toBe(1.0);
    });
  });

  describe("RiskAssessmentSchema", () => {
    it("accepts valid assessment", () => {
      const assessment = RiskAssessmentSchema.parse({
        session_id: "sess_001",
        total_score: 25,
        decision: "allow",
        signals: [],
        assessed_at: "2026-02-08T00:00:00.000Z",
      });
      expect(assessment.decision).toBe("allow");
    });

    it("accepts all decision types", () => {
      for (const decision of ["allow", "review", "block"] as const) {
        const result = RiskAssessmentSchema.parse({
          session_id: "sess_001",
          total_score: 50,
          decision,
          signals: [],
          assessed_at: "2026-02-08T00:00:00.000Z",
        });
        expect(result.decision).toBe(decision);
      }
    });
  });

  describe("DeviceFingerprintSchema", () => {
    it("accepts full fingerprint", () => {
      const fp = DeviceFingerprintSchema.parse({
        user_agent: "Mozilla/5.0",
        screen_resolution: "1920x1080",
        language: "en-US",
        timezone_offset: -300,
        timezone: "America/New_York",
        platform: "MacIntel",
        hardware_concurrency: 8,
        device_memory: 16,
        max_touch_points: 0,
        cookies_enabled: true,
        do_not_track: false,
        color_depth: 24,
        plugin_count: 3,
      });
      expect(fp.platform).toBe("MacIntel");
    });

    it("accepts empty fingerprint (all optional)", () => {
      const fp = DeviceFingerprintSchema.parse({});
      expect(fp).toBeDefined();
    });
  });

  describe("VelocityRecordSchema", () => {
    it("accepts valid velocity record", () => {
      const record = VelocityRecordSchema.parse({
        key: "test@example.com",
        key_type: "email",
        session_ids: ["s1", "s2"],
        window_start: "2026-02-08T00:00:00.000Z",
        window_end: "2026-02-08T00:15:00.000Z",
        count: 2,
      });
      expect(record.count).toBe(2);
    });
  });

  describe("MerchantFeedbackSchema", () => {
    it("accepts all verdict types", () => {
      for (const verdict of ["legitimate", "fraudulent", "uncertain"] as const) {
        const fb = MerchantFeedbackSchema.parse({
          session_id: "sess_001",
          verdict,
          feedback_at: "2026-02-08T00:00:00.000Z",
        });
        expect(fb.verdict).toBe(verdict);
      }
    });
  });

  describe("FraudCheckMetadataSchema", () => {
    it("accepts valid metadata with assessment", () => {
      const meta = FraudCheckMetadataSchema.parse({
        assessment: {
          session_id: "sess_001",
          total_score: 10,
          decision: "allow",
          signals: [],
          assessed_at: "2026-02-08T00:00:00.000Z",
        },
        cached: false,
      });
      expect(meta.assessment.decision).toBe("allow");
    });
  });
});
