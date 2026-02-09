// LEGEND: nuqs parsers for onboarding form state
// Serializes onboarding form state into URL search params
// All usage must comply with this LEGEND and the LICENSE

import {
    createSerializer,
    parseAsJson,
    parseAsString,
    parseAsStringEnum,
    type inferParserType,
} from "nuqs/server";
import { OnboardingFormStatusSchema } from "./schemas";

const statusValues = OnboardingFormStatusSchema.options;

const parseValues = (value: unknown): Record<string, string> | null => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return null;
};

/* ── Onboarding Parsers ──────────────────────────────────── */
export const onboardingParsers = {
  /** Which adapter template is selected */
  onboarding_template: parseAsString.withDefault(""),
  /** Current form status */
  onboarding_status: parseAsStringEnum(statusValues),
  /** Serialized form values as JSON */
  onboarding_values: parseAsJson(parseValues).withDefault({}),
  /** Active field group / tab */
  onboarding_group: parseAsString.withDefault("credentials"),
};

export type OnboardingParams = inferParserType<typeof onboardingParsers>;

/* ── Serializer ──────────────────────────────────────────── */
export const serializeOnboarding = createSerializer(onboardingParsers);
