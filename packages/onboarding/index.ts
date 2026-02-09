// LEGEND: Onboarding template registry and form schema system
// Provides JSON-schema-driven adapter onboarding for legal customer signup
// All usage must comply with this LEGEND and the LICENSE

/* ── Schema & Types ──────────────────────────────────────── */
export {
    OnboardingFieldSchema,
    OnboardingFormStatusSchema, OnboardingSubmissionSchema, OnboardingTemplateSchema, type OnboardingField,
    type OnboardingFieldType,
    type OnboardingFormStatus, type OnboardingSubmission, type OnboardingTemplate
} from "./schemas";

/* ── Registry ────────────────────────────────────────────── */
export {
    getOnboardingTemplate,
    listOnboardingTemplates,
    listOnboardingTemplatesByCategory, registerOnboardingTemplate
} from "./registry";

/* ── Adapter Templates ───────────────────────────────────── */
export {
    ALL_ONBOARDING_TEMPLATES,
    ONBOARDING_COMPROPAGO,
    ONBOARDING_DISPUTE_MERCHANT_OPS,
    ONBOARDING_DISPUTE_RESPONSE,
    ONBOARDING_MERCADOPAGO,
    ONBOARDING_MERCHANT_BANK_PAYOUT,
    ONBOARDING_MERCHANT_DOCUMENTS,
    ONBOARDING_MERCHANT_LEGAL_KYC,
    ONBOARDING_MERCHANT_TAX_CFDI,
    ONBOARDING_PAYPAL_MX,
    ONBOARDING_POLAR,
    ONBOARDING_REFUND_REQUEST,
    ONBOARDING_SHOPIFY,
    ONBOARDING_STP,
    ONBOARDING_STRIPE,
    ONBOARDING_THIRDWEB
} from "./templates";

/* ── nuqs Parsers ────────────────────────────────────────── */
export {
    onboardingParsers,
    serializeOnboarding,
    type OnboardingParams
} from "./parsers";

/* ── Validation Utilities ────────────────────────────────── */
export {
    getFieldsByGroup, getRequiredFields, validateClabe, validateCurp, validateRfc, validateSubmission, type ValidationResult
} from "./validation";

