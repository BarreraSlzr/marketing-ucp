# User Stories & Workflows

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
