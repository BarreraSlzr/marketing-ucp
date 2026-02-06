# Architecture Overview

## System Context

```mermaid
graph TB
    subgraph External["External Services"]
        Shopify["Shopify Storefront API"]
        Polar["Polar Payments"]
        CMS["Content / CMS"]
    end

    subgraph App["marketing-ucp (Next.js 16)"]
        direction TB
        Homepage["/ Homepage<br/>Marketing & Opportunities"]
        Checkout["/checkout<br/>UCP Checkout Forms"]
        Confirm["/checkout/confirm<br/>Checkout Confirmation"]
        Content["/content (future)<br/>Product Publishing"]
    end

    subgraph Packages["Internal Packages (Turborepo)"]
        Entities["@repo/entities<br/>Zod schemas + nuqs parsers"]
        UI["@repo/ui<br/>CSS-module components"]
        BizLogic["@repo/logic (planned)<br/>EffectTS business layer"]
    end

    Homepage -->|"discover products"| Shopify
    Homepage -->|"pricing / subscribe"| Polar
    Checkout -->|"validate & serialize"| Entities
    Checkout -->|"render forms"| UI
    Checkout -->|"process payment"| Polar
    Checkout -->|"fulfill order"| Shopify
    Content -->|"publish"| CMS
    BizLogic -->|"governs"| Checkout
    BizLogic -->|"governs"| Content
```

## Monorepo Package Graph

```mermaid
graph LR
    Web["apps/web (Next.js)"] --> Entities["@repo/entities"]
    Web --> UI["@repo/ui"]
    Web --> Logic["@repo/logic (planned)"]
    Logic --> Entities
    UI --> Entities
```

## Route Structure

| Route | Purpose | State Source |
|---|---|---|
| `/` | Marketing homepage, service opportunities | static / CMS |
| `/checkout` | UCP checkout forms (buyer, address, payment) | nuqs URL params |
| `/checkout/confirm` | Checkout summary & confirmation | nuqs URL params |
| `/content` (planned) | Product creation & publishing | server / CMS |

## Data Flow: Stateless URL-Driven Forms

```mermaid
sequenceDiagram
    participant URL as URL Search Params
    participant nuqs as nuqs Adapter
    participant Form as Uncontrolled Form
    participant Action as Server Action
    participant Zod as Zod Validation

    URL->>nuqs: parse search params
    nuqs->>Form: provide defaultValue to inputs
    Form->>Action: submit via formId + FormData
    Action->>Zod: validate FormData
    Zod-->>Action: success / errors
    Action-->>URL: redirect with serialized state
```
