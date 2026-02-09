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
    ONBOARDING_API_KEY_MANAGEMENT, ONBOARDING_AUTOMATION_ENDPOINTS, ONBOARDING_COMPROPAGO,
    ONBOARDING_DISPUTE_MERCHANT_OPS,
    ONBOARDING_DISPUTE_RESPONSE, ONBOARDING_FEEDBACK_MERCHANT, ONBOARDING_FEEDBACK_REVIEW_CUSTOMER, ONBOARDING_MERCADOPAGO, ONBOARDING_MERCHANT_BANK_PAYOUT,
    ONBOARDING_MERCHANT_DOCUMENTS, ONBOARDING_MERCHANT_INVOICE_CFDI_REQUEST, ONBOARDING_MERCHANT_LEGAL_KYC, ONBOARDING_MERCHANT_PAYOUT_SCHEDULE,
    ONBOARDING_MERCHANT_RECONCILIATION_QUERY,
    ONBOARDING_MERCHANT_TAX_CFDI,
    ONBOARDING_PAYPAL_MX,
    ONBOARDING_POLAR,
    ONBOARDING_REFUND_REQUEST,
    ONBOARDING_SHOPIFY,
    ONBOARDING_STP,
    ONBOARDING_STRIPE,
    ONBOARDING_SUBSCRIPTION_CANCEL,
    ONBOARDING_SUBSCRIPTION_PAYMENT_UPDATE,
    ONBOARDING_SUBSCRIPTION_PLAN_CHANGE, ONBOARDING_SUPPORT_TICKET_CUSTOMER,
    ONBOARDING_SUPPORT_TICKET_MERCHANT, ONBOARDING_THIRDWEB,
    ONBOARDING_WEBHOOK_CONFIG
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

