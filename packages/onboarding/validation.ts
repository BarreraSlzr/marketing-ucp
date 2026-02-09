// LEGEND: Validation utilities for onboarding submissions
// Validates form data against template field requirements
// Includes Mexico-specific compliance validation (RFC, CURP, CLABE)
// All usage must comply with this LEGEND and the LICENSE

import type { OnboardingField, OnboardingTemplate } from "./schemas";

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    key: string;
    label: string;
    message: string;
  }>;
}

/* ── Mexico Compliance Validators ────────────────────────── */

/**
 * Validate a Mexican CLABE (18 digits) with Luhn-style checksum.
 * The control digit (18th) must satisfy the CLABE verification algorithm.
 */
export function validateClabe(params: { clabe: string }): boolean {
  const { clabe } = params;
  if (!/^\d{18}$/.test(clabe)) return false;

  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(clabe[i], 10) * weights[i]) % 10;
  }
  const control = (10 - (sum % 10)) % 10;
  return control === parseInt(clabe[17], 10);
}

/**
 * Validate Mexican RFC format (basic structure check).
 * Persona Física: 4 letters + 6 digits + 3 homoclave = 13 chars
 * Persona Moral: 3 letters + 6 digits + 3 homoclave = 12 chars
 */
export function validateRfc(params: { rfc: string }): boolean {
  const { rfc } = params;
  return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc);
}

/**
 * Validate Mexican CURP format (18 characters).
 */
export function validateCurp(params: { curp: string }): boolean {
  const { curp } = params;
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp);
}

/* ── Enhanced Validation Keys ────────────────────────────── */
const MEXICO_FIELD_VALIDATORS: Record<string, (value: string) => string | null> = {
  clabe: (value) =>
    validateClabe({ clabe: value }) ? null : "Invalid CLABE: checksum verification failed",
  rfc: (value) =>
    validateRfc({ rfc: value }) ? null : "Invalid RFC format",
  curp: (value) =>
    validateCurp({ curp: value }) ? null : "Invalid CURP format",
  beneficiaryRfc: (value) =>
    validateRfc({ rfc: value }) ? null : "Invalid beneficiary RFC format",
};

/**
 * Validate submission values against a template's field definitions.
 */
export function validateSubmission(params: {
  template: OnboardingTemplate;
  values: Record<string, string>;
}): ValidationResult {
  const { template, values } = params;
  const errors: ValidationResult["errors"] = [];

  for (const field of template.fields) {
    const value = values[field.key]?.trim() ?? "";

    // Required check
    if (field.required && !value) {
      errors.push({
        key: field.key,
        label: field.label,
        message: `${field.label} is required`,
      });
      continue;
    }

    // Skip further validation for empty optional fields
    if (!value) continue;

    // Pattern validation
    if (field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        errors.push({
          key: field.key,
          label: field.label,
          message: field.patternMessage ?? `${field.label} has an invalid format`,
        });
      }
    }

    // Select field: value must be one of the options
    if (field.type === "select" && field.options) {
      const validValues = field.options.map((o) => o.value);
      if (!validValues.includes(value)) {
        errors.push({
          key: field.key,
          label: field.label,
          message: `${field.label} must be one of: ${validValues.join(", ")}`,
        });
      }
    }

    // Email validation
    if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({
        key: field.key,
        label: field.label,
        message: `${field.label} must be a valid email address`,
      });
    }

    // URL validation
    if (field.type === "url") {
      try {
        new URL(value);
      } catch {
        errors.push({
          key: field.key,
          label: field.label,
          message: `${field.label} must be a valid URL`,
        });
      }
    }

    // Mexico compliance field validators (CLABE checksum, RFC, CURP)
    if (field.key in MEXICO_FIELD_VALIDATORS) {
      const mx = MEXICO_FIELD_VALIDATORS[field.key](value);
      if (mx) {
        errors.push({ key: field.key, label: field.label, message: mx });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get only the required fields from a template.
 */
export function getRequiredFields(params: {
  template: OnboardingTemplate;
}): OnboardingField[] {
  return params.template.fields.filter((f) => f.required);
}

/**
 * Group fields by their `group` property, sorted by `order`.
 */
export function getFieldsByGroup(params: {
  template: OnboardingTemplate;
}): Map<string, OnboardingField[]> {
  const groups = new Map<string, OnboardingField[]>();
  const sorted = [...params.template.fields].sort((a, b) => a.order - b.order);

  for (const field of sorted) {
    const group = field.group;
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group)!.push(field);
  }

  return groups;
}
