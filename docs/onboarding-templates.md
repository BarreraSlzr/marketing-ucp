# Onboarding Templates — Plug-in Form System

> Automated adapter onboarding via JSON schema templates + plug-in rendering for legal customer signup.

## Overview

The onboarding system allows any **IFPE adapter** (payment handler, storefront, web3 provider) to define its configuration requirements as a **typed JSON schema template**. These templates are automatically rendered as interactive forms with validation, URL-state binding via nuqs, and webhook-driven submission.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  packages/onboarding/                           │
│  ├── schemas.ts      ← Zod schemas + types     │
│  ├── registry.ts     ← Template registry (Map)  │
│  ├── templates.ts    ← All adapter templates     │
│  ├── parsers.ts      ← nuqs URL-state parsers   │
│  └── validation.ts   ← Field validation utils   │
├─────────────────────────────────────────────────┤
│  components/onboarding/                         │
│  ├── adapter-selector.tsx   ← Pick an adapter   │
│  ├── onboarding-form.tsx    ← Dynamic renderer  │
│  └── onboarding-client.tsx  ← Full page client  │
├─────────────────────────────────────────────────┤
│  app/api/onboarding/route.ts   ← API endpoint  │
│  app/[locale]/onboarding/page.tsx  ← Page route │
└─────────────────────────────────────────────────┘
```

## Defining a Template

Each adapter provides an `OnboardingTemplate` object:

```typescript
import type { OnboardingTemplate } from "@repo/onboarding";

const ONBOARDING_MY_ADAPTER: OnboardingTemplate = {
  id: "my-adapter",
  name: "My Payment Service",
  description: "Description for legal customers",
  category: "payment", // payment | storefront | web3 | bank_transfer | cash_payment | compliance
  regions: ["MX"],     // ISO 3166 codes, or ["global"]
  docsUrl: "https://docs.myadapter.com",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",       // text | email | password | url | tel | select | checkbox | textarea | file | hidden
      placeholder: "ak_...",
      description: "Your private API key",
      required: true,
      group: "credentials",   // Fields are grouped visually by this key
      envVar: "MY_ADAPTER_API_KEY",
      order: 0,
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      required: true,
      defaultValue: "sandbox",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Production", value: "production" },
      ],
      group: "configuration",
      envVar: "MY_ADAPTER_ENV",
      order: 1,
    },
  ],
  webhookUrl: "https://my-service.com/webhooks/onboarding", // optional
  version: "2026-02-08",
};
```

### Field Types

| Type       | Renders As                 | Validation              |
|------------|----------------------------|-------------------------|
| `text`     | `<Input type="text">`      | Required, pattern       |
| `email`    | `<Input type="email">`     | Required, email format  |
| `password` | `<Input type="password">`  | Required, pattern       |
| `url`      | `<Input type="url">`       | Required, URL format    |
| `tel`      | `<Input type="tel">`       | Required, pattern       |
| `select`   | `<NativeSelect>`           | Required, in-options    |
| `checkbox` | `<Checkbox>`               | —                       |
| `textarea` | `<textarea>`               | Required                |
| `file`     | `<Input type="file">`      | Required                |
| `hidden`   | `<input type="hidden">`    | —                       |

### Field Properties

| Property         | Type                              | Required | Description                              |
|------------------|-----------------------------------|----------|------------------------------------------|
| `key`            | `string`                          | yes      | Machine-readable key (maps to env var)   |
| `label`          | `string`                          | yes      | Human-readable label                     |
| `type`           | `OnboardingFieldType`             | no       | Input type (default: `"text"`)           |
| `placeholder`    | `string`                          | no       | Placeholder text                         |
| `description`    | `string`                          | no       | Help text below the field                |
| `required`       | `boolean`                         | no       | Whether field must be filled (default: `true`) |
| `defaultValue`   | `string`                          | no       | Pre-filled value                         |
| `options`        | `{label, value}[]`                | no       | For `select` fields only                 |
| `pattern`        | `string`                          | no       | Regex validation pattern                 |
| `patternMessage` | `string`                          | no       | Custom error for pattern mismatch        |
| `group`          | `string`                          | no       | Visual grouping key (default: `"general"`) |
| `envVar`         | `string`                          | no       | Corresponding env var name (informational) |
| `order`          | `number`                          | no       | Sort order within group (default: `0`)   |

## Registering a Template

Templates self-register when imported. To add a new one:

```typescript
// packages/onboarding/templates.ts
import { registerOnboardingTemplate } from "./registry";

export const ONBOARDING_MY_ADAPTER: OnboardingTemplate = { /* ... */ };

// Auto-register
registerOnboardingTemplate({ template: ONBOARDING_MY_ADAPTER });
```

Then add it to the `ALL_ONBOARDING_TEMPLATES` array and re-export from `index.ts`.

## Querying Templates

```typescript
import {
  getOnboardingTemplate,
  listOnboardingTemplates,
  listOnboardingTemplatesByCategory,
} from "@repo/onboarding";

// By ID
const stripe = getOnboardingTemplate({ id: "stripe" });

// All templates
const all = listOnboardingTemplates();

// By category
const payments = listOnboardingTemplatesByCategory({ category: "payment" });
```

## URL State (nuqs)

The entire onboarding form state is serialized into URL search params:

| Param                  | Type             | Description                    |
|------------------------|------------------|--------------------------------|
| `onboarding_template`  | `string`         | Selected adapter template ID   |
| `onboarding_status`    | `enum`           | draft / submitted / approved   |
| `onboarding_values`    | `JSON object`    | Form field key-value pairs     |
| `onboarding_group`     | `string`         | Active tab/group               |

This means the entire form state is **shareable via URL** and **stateless**.

## API Endpoint

### `POST /api/onboarding`

Submit a completed onboarding form.

**Request body:**

```json
{
  "templateId": "stripe",
  "values": {
    "secretKey": "sk_live_...",
    "webhookSecret": "whsec_..."
  },
  "status": "submitted",
  "updatedAt": "2026-02-08T12:00:00.000Z"
}
```

**Response (200):**

```json
{
  "ok": true,
  "templateId": "stripe",
  "status": "submitted",
  "webhookResult": { "sent": false },
  "submittedAt": "2026-02-08T12:00:00.000Z"
}
```

**Validation error (422):**

```json
{
  "error": "Validation failed",
  "fieldErrors": [
    { "key": "secretKey", "label": "Secret Key", "message": "Secret Key is required" }
  ]
}
```

### `GET /api/onboarding`

Returns a JSON summary of all registered templates.

### Webhook Integration

If a template has a `webhookUrl`, the API will POST the following payload on submission:

```json
{
  "event": "onboarding.submitted",
  "templateId": "stp",
  "adapterName": "STP",
  "category": "bank_transfer",
  "regions": ["MX"],
  "values": { "empresa": "...", "apiKey": "..." },
  "submittedAt": "2026-02-08T12:00:00.000Z"
}
```

## Built-in Templates

| ID            | Name              | Category        | Regions     | Required Fields |
|---------------|-------------------|-----------------|-------------|-----------------|
| `stripe`      | Stripe            | payment         | global      | 2               |
| `polar`       | Polar             | payment         | global      | 2               |
| `paypal-mx`   | PayPal México     | payment         | MX          | 4               |
| `mercadopago` | MercadoPago       | payment         | MX,AR,BR... | 3               |
| `compropago`  | ComproPago        | cash_payment    | MX          | 4               |
| `stp`         | STP               | bank_transfer   | MX          | 5               |
| `thirdweb`    | Thirdweb          | web3            | global      | 3               |
| `shopify`     | Shopify Storefront| storefront      | global      | 2               |

### KYC/KYB Compliance Templates

| ID                      | Name                          | Category    | Regions | Required Fields | Groups                                        |
|-------------------------|-------------------------------|-------------|---------|-----------------|-----------------------------------------------|
| `merchant-legal-kyc`    | Merchant Legal Profile        | compliance  | MX      | 9               | legal_entity, tax_identity, representative, address |
| `merchant-bank-payout`  | Merchant Bank Account         | compliance  | MX      | 8               | bank_account, payout_config, consent          |
| `merchant-tax-cfdi`     | Merchant Tax & CFDI Config    | compliance  | MX      | 3               | tax_regime, tax_rates, certificates, invoicing|
| `merchant-documents`    | Merchant Verification Docs    | compliance  | MX      | 5               | identity_documents, address_documents, tax_documents, corporate_documents, consent |

#### Merchant Legal Profile (`merchant-legal-kyc`)

Collects full KYC/KYB information for legal entities operating in Mexico:

- **Legal Entity**: Business name, trade name, entity type (Persona Física/Moral with subtypes)
- **Tax Identity**: RFC with format validation, CURP (optional, for Persona Física)
- **Representative**: Full name, email, phone with international format validation
- **Address**: Fiscal address, 5-digit postal code, Mexican state selector (32 states)

```typescript
import { ONBOARDING_MERCHANT_LEGAL_KYC } from "@repo/onboarding";

// Use standalone
<OnboardingForm template={ONBOARDING_MERCHANT_LEGAL_KYC} onSubmit={handleSubmit} />
```

#### Merchant Bank Account (`merchant-bank-payout`)

Banking information for payout disbursements:

- **Bank Account**: Bank selector (14 Mexican banks), CLABE with checksum validation, beneficiary name, beneficiary RFC
- **Payout Config**: Currency (MXN/USD), frequency (daily/weekly/biweekly/monthly)
- **Consent**: Ownership certification checkbox

#### Merchant Tax & CFDI (`merchant-tax-cfdi`)

Mexican tax compliance configuration per SAT regulations:

- **Tax Regime**: 18 SAT regime codes (601–626)
- **CFDI Usage**: 11 official CFDI use codes (G01–CP01)
- **Tax Rates**: IVA rate selector (16%/8%/0%/exempt), IVA/ISR withholding toggles
- **Certificates**: CSD serial number (20 digits), CSD password
- **Invoicing**: Series prefix, default invoice notes

#### Merchant Documents (`merchant-documents`)

Document verification for KYC/KYB compliance:

- **Identity**: INE/IFE front and back (required)
- **Address**: Proof of address (required, max 3 months old)
- **Tax**: Constancia de Situación Fiscal (required), CSD certificate (.cer), CSD private key (.key)
- **Corporate**: Acta Constitutiva, Poder Notarial (optional, for Persona Moral)
- **Consent**: Data processing authorization under LFPDPPP

### Mexico Compliance Validation

The validation module includes specialized Mexico compliance validators:

```typescript
import { validateRfc, validateCurp, validateClabe } from "@repo/onboarding";

// RFC validation (structure check)
validateRfc({ rfc: "ABC010101AB0" });    // true (Persona Moral)
validateRfc({ rfc: "BADD110313AB9" });   // true (Persona Física)

// CURP validation (18-char format)
validateCurp({ curp: "BADD110313HCMLNS09" }); // true

// CLABE validation (18 digits + Luhn-style checksum)
validateClabe({ clabe: "646180110400000007" }); // true (checksum verified)
validateClabe({ clabe: "646180110400000001" }); // false (bad checksum)
```

These validators are automatically applied during `validateSubmission()` for fields with keys: `rfc`, `curp`, `clabe`, `beneficiaryRfc`.

## Using the Components

### Full onboarding page (default)

```tsx
import { OnboardingClient } from "@/components/onboarding";

// Renders adapter selector + dynamic form + submit
<OnboardingClient />
```

### Custom adapter list

```tsx
import { OnboardingClient } from "@/components/onboarding";
import { ONBOARDING_STP, ONBOARDING_PAYPAL_MX } from "@repo/onboarding";

<OnboardingClient templates={[ONBOARDING_STP, ONBOARDING_PAYPAL_MX]} />
```

### Standalone form for a known adapter

```tsx
import { OnboardingForm } from "@/components/onboarding";
import { ONBOARDING_STRIPE } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_STRIPE}
  onSubmit={async (data) => { /* handle */ }}
  onChange={(info) => { /* observe field changes */ }}
/>
```

## Validation

The `validateSubmission` function checks:

1. **Required fields** — non-empty values
2. **Pattern matching** — regex patterns (e.g. CLABE = 18 digits)
3. **Select constraints** — value must be in defined options
4. **Email format** — basic email validation
5. **URL format** — valid URL parsing

```typescript
import { validateSubmission, ONBOARDING_STP } from "@repo/onboarding";

const result = validateSubmission({
  template: ONBOARDING_STP,
  values: { empresa: "MI_EMPRESA", apiKey: "key123", clabe: "123" },
});
// result.valid === false
// result.errors[0].message === "CLABE must be exactly 18 digits"
```

## Extending the System

### 1. Add a new adapter template

1. Define the `OnboardingTemplate` in `packages/onboarding/templates.ts`
2. Add it to `ALL_ONBOARDING_TEMPLATES`
3. Export it from `packages/onboarding/index.ts`
4. It will automatically appear in the UI

### 2. Add legal/compliance fields

Add fields with `group: "legal"` or `group: "compliance"`:

```typescript
{
  key: "rfc",
  label: "RFC (Tax ID)",
  type: "text",
  pattern: "^[A-Z&Ñ]{3,4}\\d{6}[A-Z0-9]{3}$",
  patternMessage: "Must be a valid Mexican RFC",
  required: true,
  group: "legal",
  order: 0,
}
```

### 3. Custom webhook handler

Set `webhookUrl` on any template to receive submission events at your endpoint.

### 4. Persist submissions

The current API is stateless. To persist, add a KV/DB write in `app/api/onboarding/route.ts`:

```typescript
// In the POST handler, after validation:
await db.onboardingSubmissions.create({ data: submission });
```

## Flow Diagram

```
User visits /onboarding
    → AdapterSelector shows all templates (grouped by category)
    → User picks an adapter
    → URL updates with ?onboarding_template=stp
    → OnboardingForm renders fields from template schema
    → User fills fields (each change synced to URL via nuqs)
    → User submits
    → Client-side validation (validateSubmission)
    → POST /api/onboarding
    → Server validates again
    → If template.webhookUrl → forward to webhook
    → Response → success/error banner
```
