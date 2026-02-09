// LEGEND: Validation utilities for onboarding submissions
// Validates form data against template field requirements
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
