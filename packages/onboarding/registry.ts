// LEGEND: Onboarding template registry
// Central store for adapter onboarding templates
// All usage must comply with this LEGEND and the LICENSE

import type { OnboardingTemplate } from "./schemas";

/* ── Registry Map ────────────────────────────────────────── */
const registry = new Map<string, OnboardingTemplate>();

/**
 * Register an onboarding template for an adapter/service.
 * Overwrites if a template with the same id already exists.
 */
export function registerOnboardingTemplate(
  params: { template: OnboardingTemplate }
): void {
  registry.set(params.template.id, params.template);
}

/**
 * Retrieve a template by adapter id.
 * Returns undefined if not found.
 */
export function getOnboardingTemplate(
  params: { id: string }
): OnboardingTemplate | undefined {
  return registry.get(params.id);
}

/**
 * List all registered onboarding templates.
 */
export function listOnboardingTemplates(): OnboardingTemplate[] {
  return Array.from(registry.values());
}

/**
 * List templates filtered by category.
 */
export function listOnboardingTemplatesByCategory(
  params: { category: OnboardingTemplate["category"] }
): OnboardingTemplate[] {
  return Array.from(registry.values()).filter(
    (t) => t.category === params.category
  );
}
