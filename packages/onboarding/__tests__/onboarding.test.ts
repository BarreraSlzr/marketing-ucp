import { describe, expect, it } from "bun:test";
import {
    getOnboardingTemplate,
    listOnboardingTemplates,
    listOnboardingTemplatesByCategory,
} from "../registry";
import {
    OnboardingFieldSchema,
    OnboardingSubmissionSchema,
    OnboardingTemplateSchema,
} from "../schemas";
import {
    ALL_ONBOARDING_TEMPLATES,
    ONBOARDING_PAYPAL_MX,
    ONBOARDING_STP,
    ONBOARDING_STRIPE,
} from "../templates";
import { getFieldsByGroup, getRequiredFields, validateSubmission } from "../validation";

describe("Onboarding Schemas", () => {
  it("validates a well-formed field", () => {
    const result = OnboardingFieldSchema.safeParse({
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      group: "credentials",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a field with missing key", () => {
    const result = OnboardingFieldSchema.safeParse({
      label: "API Key",
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("validates all built-in templates against the schema", () => {
    for (const template of ALL_ONBOARDING_TEMPLATES) {
      const result = OnboardingTemplateSchema.safeParse(template);
      expect(result.success).toBe(true);
    }
  });

  it("validates a submission object", () => {
    const result = OnboardingSubmissionSchema.safeParse({
      templateId: "stripe",
      values: { secretKey: "sk_test_123", webhookSecret: "whsec_test" },
      status: "submitted",
      updatedAt: "2026-02-08T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("Onboarding Registry", () => {
  it("registers and retrieves all built-in templates", () => {
    const all = listOnboardingTemplates();
    expect(all.length).toBe(ALL_ONBOARDING_TEMPLATES.length);
  });

  it("retrieves a template by id", () => {
    const stripe = getOnboardingTemplate({ id: "stripe" });
    expect(stripe).toBeDefined();
    expect(stripe?.name).toBe("Stripe");
  });

  it("returns undefined for unknown template", () => {
    const nope = getOnboardingTemplate({ id: "nonexistent" });
    expect(nope).toBeUndefined();
  });

  it("filters templates by category", () => {
    const payments = listOnboardingTemplatesByCategory({ category: "payment" });
    expect(payments.length).toBeGreaterThanOrEqual(4); // stripe, polar, paypal-mx, mercadopago
    for (const t of payments) {
      expect(t.category).toBe("payment");
    }
  });

  it("filters bank_transfer templates", () => {
    const bank = listOnboardingTemplatesByCategory({ category: "bank_transfer" });
    expect(bank.length).toBe(1);
    expect(bank[0].id).toBe("stp");
  });
});

describe("Onboarding Validation", () => {
  it("passes for a fully valid Stripe submission", () => {
    const result = validateSubmission({
      template: ONBOARDING_STRIPE,
      values: {
        secretKey: "sk_test_1234567890",
        webhookSecret: "whsec_test_secret",
      },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("fails for missing required fields", () => {
    const result = validateSubmission({
      template: ONBOARDING_STRIPE,
      values: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  it("validates CLABE pattern for STP", () => {
    const result = validateSubmission({
      template: ONBOARDING_STP,
      values: {
        empresa: "MI_EMPRESA",
        apiKey: "key123",
        webhookSecret: "secret",
        clabe: "123", // too short
        environment: "sandbox",
      },
    });
    expect(result.valid).toBe(false);
    const clabeError = result.errors.find((e) => e.key === "clabe");
    expect(clabeError).toBeDefined();
    expect(clabeError?.message).toContain("18 digits");
  });

  it("validates select field values", () => {
    const result = validateSubmission({
      template: ONBOARDING_PAYPAL_MX,
      values: {
        clientId: "AV3test",
        clientSecret: "secret",
        webhookId: "WH-test",
        environment: "invalid_env",
      },
    });
    expect(result.valid).toBe(false);
    const envError = result.errors.find((e) => e.key === "environment");
    expect(envError).toBeDefined();
  });

  it("passes with valid CLABE", () => {
    const result = validateSubmission({
      template: ONBOARDING_STP,
      values: {
        empresa: "MI_EMPRESA",
        apiKey: "key123",
        webhookSecret: "secret",
        clabe: "646180110400000001",
        environment: "sandbox",
      },
    });
    expect(result.valid).toBe(true);
  });
});

describe("Onboarding Field Utilities", () => {
  it("getRequiredFields returns only required", () => {
    const required = getRequiredFields({ template: ONBOARDING_STRIPE });
    expect(required.length).toBe(2);
    for (const f of required) {
      expect(f.required).toBe(true);
    }
  });

  it("getFieldsByGroup groups correctly", () => {
    const groups = getFieldsByGroup({ template: ONBOARDING_STP });
    expect(groups.has("credentials")).toBe(true);
    expect(groups.has("configuration")).toBe(true);
    expect(groups.get("credentials")!.length).toBe(4); // empresa, apiKey, clabe, webhookSecret
    expect(groups.get("configuration")!.length).toBe(1); // environment
  });

  it("fields within groups are sorted by order", () => {
    const groups = getFieldsByGroup({ template: ONBOARDING_STP });
    const creds = groups.get("credentials")!;
    for (let i = 1; i < creds.length; i++) {
      expect(creds[i].order).toBeGreaterThanOrEqual(creds[i - 1].order);
    }
  });
});
