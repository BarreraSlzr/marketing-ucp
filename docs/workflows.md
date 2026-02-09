# User Stories & Workflows

## Workflow Definitions (Canonical)

Workflow definitions live in `packages/workflows/registry.ts` and are the canonical, shareable artifacts for checkout/payment flows. Each workflow is a versioned step list that can be used for UI mapping, automation, and observability.

### Standard Format (TS object)

```ts
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: "checkout" | "payment" | "onboarding";
  version: string;
  pipeline_type?: string;
  steps: Array<{
    id: string;
    label: string;
    kind: "page" | "form" | "action" | "api";
    required: boolean;
    description?: string;
    form_ids?: string[];
    action_ids?: string[];
    endpoint?: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string };
    pipeline_steps?: string[];
  }>;
}
```

### Checkout Form Inventory (Current UI)

| Step | Form ID | Server Action | Notes |
| --- | --- | --- | --- |
| Buyer details | `buyer-form` | `submitBuyerAction` | Buyer identity + contact info |
| Billing address | `billing-form` | `submitAddressAction` | Billing address details |
| Shipping address | `shipping-form` | `submitAddressAction` | Shipping address details |
| Payment details | `payment-form` | `submitPaymentAction` | Payment authorization |
| Checkout submit | `checkout-form` | `submitCheckoutAction` | Final submit + redirect |

Reminder: use `formId` wiring (`form` attribute) for inputs and buttons instead of relying on form children so steps remain decoupled and traceable.

## Checkout Baseline Workflow (Canonical)

The baseline workflow maps the UI steps above to pipeline observability steps (see `@repo/pipeline`).

```json
{
  "id": "checkout_baseline",
  "name": "Checkout Baseline Workflow",
  "pipeline_type": "checkout_physical",
  "steps": [
    { "id": "select_product", "kind": "page", "required": true, "endpoint": { "method": "GET", "path": "/checkout" } },
    { "id": "buyer_details", "kind": "form", "required": true, "form_ids": ["buyer-form"], "pipeline_steps": ["buyer_validated"] },
    { "id": "address_details", "kind": "form", "required": true, "form_ids": ["billing-form", "shipping-form"], "pipeline_steps": ["address_validated"] },
    { "id": "payment_details", "kind": "form", "required": true, "form_ids": ["payment-form"], "pipeline_steps": ["payment_initiated"] },
    { "id": "submit_checkout", "kind": "action", "required": true, "action_ids": ["submitCheckoutAction"], "pipeline_steps": ["payment_confirmed", "checkout_completed"] },
    { "id": "confirmation", "kind": "page", "required": true, "endpoint": { "method": "GET", "path": "/checkout/confirm" } }
  ]
}
```

### cURL/API Automation (Headless Validation)

1) Create a checkout session and receive a checkout URL:

```bash
curl -s http://localhost:3000/api/checkout \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{
    "currency": "usd",
    "line_items": [
      { "id": "sku_123", "name": "Starter Bundle", "quantity": 1, "unit_price": 4900 }
    ],
    "buyer": { "email": "buyer@example.com", "first_name": "Taylor", "last_name": "Lee" }
  }'
```

2) Visit the `checkout_url` from the response to walk the UI workflow.

3) Track pipeline steps (optional) for observability:

```bash
curl -s http://localhost:3000/api/pipeline/track \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -d '{
    "event": {
      "id": "chk_123.checkout_physical.buyer_validated.0",
      "session_id": "chk_123",
      "pipeline_type": "checkout_physical",
      "step": "buyer_validated",
      "status": "success",
      "timestamp": "2025-02-01T12:00:00.000Z"
    }
  }'
```

4) Observe pipeline completion status:

```bash
curl -s "http://localhost:3000/api/pipeline/status?session_id=chk_123&pipeline_type=checkout_physical"
```

### How to Add or Extend Workflows

1) Define a new workflow in `packages/workflows/registry.ts` and add it to `WORKFLOW_DEFINITIONS`.
2) Map UI forms/actions via `form_ids` and `action_ids` so steps remain traceable.
3) Link the workflow to a `pipeline_type` where observability is required.
4) Add/extend tests in `packages/workflows/__tests__/registry.test.ts`.
5) Update this doc with the new workflow JSON snippet and any automation notes.

## 1. Checkout Pipeline (Current)

**Goal:** A buyer completes a purchase via UCP-compliant stateless forms.

```mermaid
stateDiagram-v2
    [*] --> Incomplete : session created
    Incomplete --> RequiresEscalation : validation fails
    RequiresEscalation --> Incomplete : buyer fixes errors
    Incomplete --> ReadyForComplete : all sections valid
    ReadyForComplete --> CompleteInProgress : submit checkout
    CompleteInProgress --> Completed : payment confirmed
    CompleteInProgress --> Canceled : payment declined
    Completed --> [*]
    Canceled --> [*]
```

### Checkout Form Pipeline (Serialized Sections)

```mermaid
flowchart LR
    subgraph S1["Section 1: Buyer"]
        BF["BuyerForm<br/>formId: buyer-form"]
        BA["Server Action:<br/>submitBuyerAction"]
        BF -->|FormData| BA
        BA -->|Zod validate| BV{Valid?}
        BV -->|yes| BS[State saved to URL]
        BV -->|no| BE[Show field errors]
    end

    subgraph S2["Section 2: Billing Address"]
        AF["AddressForm<br/>formId: billing-form"]
        AA["Server Action:<br/>submitAddressAction"]
        AF -->|FormData| AA
        AA -->|Zod validate| AV{Valid?}
        AV -->|yes| AS[State saved to URL]
        AV -->|no| AE[Show field errors]
    end

    subgraph S3["Section 3: Shipping Address"]
        SF["AddressForm<br/>formId: shipping-form"]
        SA["Server Action:<br/>submitAddressAction"]
        SF -->|FormData| SA
        SA -->|Zod validate| SV{Valid?}
        SV -->|yes| SS[State saved to URL]
        SV -->|no| SE[Show field errors]
    end

    subgraph S4["Section 4: Payment"]
        PF["PaymentForm<br/>formId: payment-form"]
        PA["Server Action:<br/>submitPaymentAction"]
        PF -->|FormData| PA
        PA -->|Zod validate| PV{Valid?}
        PV -->|yes| PS[State saved to URL]
        PV -->|no| PE[Show field errors]
    end

    subgraph Submit["Final: Checkout Submit"]
        CF["form#checkout-form"]
        CA["Server Action:<br/>submitCheckoutAction"]
        CF -->|FormData| CA
        CA -->|serializeCheckout| Redirect["/checkout/confirm?..."]
    end

    S1 --> S2 --> S3 --> S4 --> Submit
```

### Form wiring via formId

```mermaid
graph TB
    subgraph DOM["DOM Tree (decoupled)"]
        FormTag["&lt;form id='buyer-form'<br/>action={serverAction} /&gt;"]
        Input1["&lt;input form='buyer-form'<br/>name='buyer_email' /&gt;"]
        Input2["&lt;input form='buyer-form'<br/>name='buyer_first_name' /&gt;"]
        SubmitBtn["&lt;button form='buyer-form'<br/>type='submit' /&gt;"]
    end

    FormTag -.->|"HTML form attribute"| Input1
    FormTag -.->|"HTML form attribute"| Input2
    FormTag -.->|"HTML form attribute"| SubmitBtn

    subgraph Action["Server Action"]
        FD["FormData collects all<br/>inputs with matching<br/>form='buyer-form'"]
    end

    FormTag -->|"on submit"| FD
```

## 2. Marketing Homepage (Planned)

**Goal:** Showcase the UCP system, let merchants discover integration paths.

```mermaid
flowchart TB
    Visit["Visitor lands on /"] --> Hero["Hero: Value proposition"]
    Hero --> Features["Feature cards:<br/>Shopify / Polar / Custom"]
    Features --> CTA["CTA: Try Checkout Demo"]
    CTA --> Checkout["/checkout"]
    Features --> Docs["Link to docs / API"]
    Features --> Pricing["Integration pricing"]
```

## 3. Content Publishing (Future)

**Goal:** Create product listings easily, publish to Shopify and make SEO-friendly.

```mermaid
flowchart LR
    Author["Content Author"] --> Editor["/content/new<br/>Product editor form"]
    Editor -->|"FormData"| Validate["Zod validation"]
    Validate --> Publish["Publish pipeline"]
    Publish --> ShopifySync["Shopify Storefront sync"]
    Publish --> SEO["Generate SEO metadata"]
    Publish --> Preview["Preview URL"]
```

## 4. Business Logic Layer (Planned -- EffectTS)

**Goal:** Govern server-side logic with typed, composable pipelines.

```mermaid
graph TB
    subgraph ServerActions["Next.js Server Actions"]
        A1["submitBuyerAction"]
        A2["submitAddressAction"]
        A3["submitPaymentAction"]
        A4["submitCheckoutAction"]
    end

    subgraph EffectLayer["@repo/logic (EffectTS)"]
        V["Validation<br/>Effect&lt;never, ValidationError, ValidBuyer&gt;"]
        E["Enrichment<br/>Effect&lt;CustomerService, never, EnrichedBuyer&gt;"]
        P["Payment Processing<br/>Effect&lt;PaymentGateway, PaymentError, Receipt&gt;"]
        N["Notification<br/>Effect&lt;EmailService, never, void&gt;"]
    end

    subgraph Services["Service Dependencies"]
        CS["CustomerService"]
        PG["PaymentGateway<br/>(Polar / Shopify)"]
        ES["EmailService"]
    end

    A1 --> V
    A4 --> V --> E --> P --> N
    E -.-> CS
    P -.-> PG
    N -.-> ES
```

## 5. Integration Map

```mermaid
graph LR
    subgraph UCP["UCP System"]
        Checkout["Checkout Pipeline"]
        Content["Content Pipeline"]
    end

    subgraph Integrations["Delegated Services"]
        Shopify["Shopify<br/>Product catalog<br/>Order fulfillment"]
        Polar["Polar<br/>Payment processing<br/>Subscriptions"]
        SEOTools["SEO / Structured Data<br/>Google rich results"]
    end

    Checkout -->|"delegate payment"| Polar
    Checkout -->|"delegate fulfillment"| Shopify
    Content -->|"sync products"| Shopify
    Content -->|"optimize"| SEOTools
    Polar -->|"webhook: payment_confirmed"| Checkout
    Shopify -->|"webhook: order_updated"| Checkout
```
