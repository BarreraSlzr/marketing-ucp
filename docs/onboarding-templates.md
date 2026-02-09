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
  category: "payment", // payment | storefront | web3 | bank_transfer | cash_payment | compliance | subscription | integration | automation
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
| `multi_select` | `<select multiple>`    | Required, in-options    |
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
| `options`        | `{label, value}[]`                | no       | For `select` and `multi_select` fields   |
| `pattern`        | `string`                          | no       | Regex validation pattern                 |
| `patternMessage` | `string`                          | no       | Custom error for pattern mismatch        |
| `group`          | `string`                          | no       | Visual grouping key (default: `"general"`) |
| `envVar`         | `string`                          | no       | Corresponding env var name (informational) |
| `order`          | `number`                          | no       | Sort order within group (default: `0`)   |

`multi_select` values are submitted as a comma-separated string (for example: `order.created,order.paid`).

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

Integration and automation templates emit category-specific events:

- `integration.config_updated`
- `integration.webhooks.updated`
- `integration.api_keys.updated`
- `automation.config_updated`

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

### Integration & Automation Templates

| ID                   | Name                     | Category     | Regions | Required Fields |
|----------------------|--------------------------|--------------|---------|-----------------|
| `webhook-config`      | Webhook Configuration    | integration  | global  | 5               |
| `api-key-management`  | API Key Management       | integration  | global  | 4               |
| `automation-endpoints`| Automation Endpoints     | automation   | global  | 3               |

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

### Payout & Reconciliation Templates

| ID                             | Name                           | Category | Regions | Required Fields | Groups                                  |
|--------------------------------|--------------------------------|----------|---------|-----------------|-----------------------------------------|
| `merchant-payout-schedule`     | Merchant Payout Schedule       | support  | global  | 7               | merchant, schedule, notifications, consent |
| `merchant-reconciliation-query`| Merchant Reconciliation Search | support  | global  | 5               | merchant, date_range, filters, delivery, consent |
| `merchant-invoice-cfdi-request`| Invoice / CFDI Request         | compliance | MX    | 11              | merchant, invoice_reference, tax_identity, cfdi_details, delivery, consent |

#### Merchant Payout Schedule (`merchant-payout-schedule`)

Configure how and when payouts are sent to a merchant available balance.

- **Schedule**: Frequency, minimum payout threshold, preferred weekday/month day
- **Settlement**: Payout currency and settlement timezone cutoffs
- **Notifications**: Delivery email for payout schedule confirmations
- **Notes**: Minimum payout amount should match the settlement currency

```typescript
import { ONBOARDING_MERCHANT_PAYOUT_SCHEDULE } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_MERCHANT_PAYOUT_SCHEDULE}
  onSubmit={async (data) => {
    await updatePayoutSchedule(data);
  }}
/>
```

#### Merchant Reconciliation Search (`merchant-reconciliation-query`)

Request a reconciliation report filtered by date range, handler, and settlement status.

- **Date Range**: Start and end date (YYYY-MM-DD)
- **Filters**: Payment handler, status, settlement or payout IDs, dispute/chargeback inclusion
- **Delivery**: Preferred export format (CSV/PDF/JSON), delivery email, optional request notes
- **Notes**: Reports are delivered within 1-2 business days by default; same-day delivery is available for urgent requests with a processing fee (use PDF output and include "urgent" in the request notes)

```typescript
import { ONBOARDING_MERCHANT_RECONCILIATION_QUERY } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_MERCHANT_RECONCILIATION_QUERY}
  onSubmit={async (data) => {
    await requestReconciliationReport(data);
  }}
/>
```

#### Invoice / CFDI Request (`merchant-invoice-cfdi-request`)

Mexico SAT-compliant CFDI invoice request form for a transaction.

- **Invoice Reference**: Transaction ID, optional order ID, amount and currency
- **Tax Identity**: Fiscal name, RFC, postal code
- **CFDI Details**: CFDI usage, payment method (PUE/PPD), optional SAT payment form code
- **Delivery**: Email for CFDI XML/PDF delivery, optional invoice notes
- **Notes**: RFC and postal code must match SAT records for successful issuance; PPD invoices require a payment complement (Complemento de Pago)

```typescript
import { ONBOARDING_MERCHANT_INVOICE_CFDI_REQUEST } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_MERCHANT_INVOICE_CFDI_REQUEST}
  onSubmit={async (data) => {
    await requestCfdiInvoice(data);
  }}
/>
```

### Subscription Management Templates

| ID                              | Name                          | Category      | Regions | Required Fields | Groups                         |
|---------------------------------|-------------------------------|---------------|---------|-----------------|--------------------------------|
| `subscription-plan-change`      | Subscription Plan Change      | subscription  | global  | 9               | subscription, plan, timing, requester, consent |
| `subscription-cancel`           | Subscription Cancellation     | subscription  | global  | 6               | subscription, timing, churn, requester, consent |
| `subscription-payment-update`   | Subscription Payment Update   | subscription  | global  | 7               | subscription, payment_method, billing, consent |

#### Subscription Plan Change (`subscription-plan-change`)

Self-service form for upgrades or downgrades with timing and proration controls.

**Fields:**
- **Subscription**: Subscription ID, optional customer ID
- **Plan Change**: Current plan, new plan, change type
- **Timing**: Immediate/next cycle/custom date, proration toggle
- **Requester**: Role, email, notes
- **Consent**: Authorization to modify the subscription

**Usage:**
```typescript
import { ONBOARDING_SUBSCRIPTION_PLAN_CHANGE } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_SUBSCRIPTION_PLAN_CHANGE}
  onSubmit={async (data) => {
    // handle plan change
  }}
/>
```

**Webhook Events:**
- `subscription.plan_changed`

#### Subscription Cancellation (`subscription-cancel`)

Cancellation form with churn reason capture and timing selection.

**Fields:**
- **Subscription**: Subscription ID
- **Timing**: End of period or immediate
- **Churn**: Reason and optional feedback
- **Requester**: Role, email, follow-up consent
- **Consent**: Authorization to cancel

**Usage:**
```typescript
import { ONBOARDING_SUBSCRIPTION_CANCEL } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_SUBSCRIPTION_CANCEL}
  onSubmit={async (data) => {
    // handle cancellation
  }}
/>
```

**Webhook Events:**
- `subscription.canceled`

#### Subscription Payment Update (`subscription-payment-update`)

Updates payment method credentials for an active subscription.

**Fields:**
- **Subscription**: Subscription ID
- **Payment Method**: Provider, type, token, optional card last 4
- **Billing**: Billing name, email, postal code, default toggle
- **Consent**: Authorization to update billing

**Usage:**
```typescript
import { ONBOARDING_SUBSCRIPTION_PAYMENT_UPDATE } from "@repo/onboarding";

<OnboardingForm
  template={ONBOARDING_SUBSCRIPTION_PAYMENT_UPDATE}
  onSubmit={async (data) => {
    // handle payment update
  }}
/>
```

**Webhook Events:**
- `subscription.payment_updated`

### Dispute & Refund Resolution Templates

| ID                      | Name                          | Category    | Regions | Required Fields | Groups                                        |
|-------------------------|-------------------------------|-------------|---------|-----------------|-----------------------------------------------|
| `dispute-response`      | Dispute Response              | dispute     | global  | 9               | dispute_details, response, evidence, contact, consent |
| `refund-request`        | Refund Request                | refund      | global  | 6               | refund_details, reason, requester, consent    |
| `dispute-merchant-ops`  | Dispute Resolution & Tracking | dispute     | global  | 6               | case_tracking, assignment, resolution, consent |

#### Dispute Response (`dispute-response`)

Merchant response form for payment disputes and chargebacks. Merchants submit evidence and explanations to defend against disputes.

**Fields:**
- **Dispute Details**: Dispute/chargeback ID, order ID, dispute type (chargeback, pre-arbitration, inquiry, fraud, product not received, product not as described), disputed amount, currency
- **Response**: Merchant narrative, customer communication log
- **Evidence**: Tracking number, delivery confirmation, invoice/receipt, additional supporting documents (file uploads)
- **Contact**: Merchant email for dispute communications
- **Consent**: Certification that information is accurate

**Usage:**
```typescript
import { ONBOARDING_DISPUTE_RESPONSE } from "@repo/onboarding";

<OnboardingForm 
  template={ONBOARDING_DISPUTE_RESPONSE}
  onSubmit={async (data) => {
    // Submit dispute response with evidence
    await submitDisputeResponse(data);
  }}
/>
```

**Webhook Events:**
When configured with `webhookUrl`, the form submission emits:
- `dispute.opened` — New dispute case created
- `dispute.evidence_submitted` — Evidence uploaded

#### Refund Request (`refund-request`)

Multi-role refund request form for customers, merchants, and operations teams. Supports full and partial refunds with evidence attachment.

**Fields:**
- **Refund Details**: Order ID, transaction ID, refund type (full/partial), refund amount (for partial), currency
- **Reason**: Refund reason (customer cancellation, product not received, damaged, not as described, duplicate charge, fraud, service not provided), additional details
- **Evidence**: Supporting documents (photos, communication screenshots, damage proof)
- **Requester**: Name, email, role (customer/merchant/ops)
- **Consent**: Authorization to process refund

**Usage:**
```typescript
import { ONBOARDING_REFUND_REQUEST } from "@repo/onboarding";

// Customer-initiated refund
<OnboardingForm 
  template={ONBOARDING_REFUND_REQUEST}
  initialValues={{ requesterRole: "customer" }}
/>

// Merchant-initiated refund
<OnboardingForm 
  template={ONBOARDING_REFUND_REQUEST}
  initialValues={{ requesterRole: "merchant" }}
/>
```

**Webhook Events:**
When configured with `webhookUrl`, the form submission emits:
- `refund.requested` — Refund request created
- `refund.approved` — Refund approved by merchant/ops
- `refund.processed` — Refund completed
- `refund.rejected` — Refund denied

#### Dispute Merchant Operations (`dispute-merchant-ops`)

Internal case tracking and resolution form for merchant/operations teams. Manages dispute lifecycle from investigation through resolution.

**Fields:**
- **Case Tracking**: Case ID, related dispute/refund ID, case type (dispute/refund/fraud investigation/compliance review), status (open/investigating/evidence submitted/awaiting customer/escalated/resolved/closed), priority
- **Assignment**: Assigned agent email, escalation contact
- **Resolution**: Internal notes, resolution summary, resolution evidence, financial impact
- **Consent**: Authorization to update case

**Available Statuses:**
- `open` — Case just created
- `investigating` — Initial investigation underway
- `evidence_submitted` — Evidence received from merchant
- `awaiting_customer` — Waiting for customer/cardholder response
- `escalated` — Case escalated to higher authority (payment processor, bank)
- `resolved_won` — Case resolved in merchant's favor
- `resolved_lost` — Case resolved against merchant
- `resolved_refunded` — Case resolved with refund issued
- `closed` — Case closed and archived

**Usage:**
```typescript
import { ONBOARDING_DISPUTE_MERCHANT_OPS } from "@repo/onboarding";

const handleStatusUpdate = async (caseData) => {
  await updateDisputeCase(caseData);
  // Trigger webhooks based on status transition
};

<OnboardingForm 
  template={ONBOARDING_DISPUTE_MERCHANT_OPS}
  onSubmit={handleStatusUpdate}
/>
```

**Webhook Events:**
- `dispute.escalated` — Case escalated
- `dispute.resolved` — Case resolution recorded
- `dispute.closed` — Case closed by ops team

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
4. For new categories, add them to the `category` enum in `schemas.ts` and add labels in `components/onboarding/adapter-selector.tsx`
5. It will automatically appear in the UI

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

### 3. Add dispute/refund resolution flows

Use the `dispute` and `refund` categories for issue resolution workflows:

```typescript
const ONBOARDING_MY_DISPUTE_FORM: OnboardingTemplate = {
  id: "my-dispute-form",
  name: "My Dispute Form",
  category: "dispute", // or "refund"
  regions: ["global"],
  fields: [
    // Evidence, tracking, narrative, etc.
  ],
  webhookUrl: "https://my-service.com/webhooks/disputes", // optional
};
```

Available webhook events:
- `dispute.opened`, `dispute.evidence_submitted`, `dispute.escalated`, `dispute.resolved`, `dispute.closed`
- `refund.requested`, `refund.approved`, `refund.processed`, `refund.rejected`

### 4. Custom webhook handler

Set `webhookUrl` on any template to receive submission events at your endpoint.

### 5. Persist submissions

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
