# Testing Plan

## Test Layers

```mermaid
graph TB
    subgraph Unit["Unit Tests (vitest)"]
        ZodTests["@repo/entities<br/>Schema validation"]
        ParserTests["@repo/entities<br/>nuqs parser round-trips"]
        UITests["@repo/ui<br/>Component render tests"]
    end

    subgraph Integration["Integration Tests"]
        ActionTests["Server Actions<br/>FormData -> Zod -> Response"]
        PipelineTests["@repo/logic<br/>EffectTS pipeline composition"]
        SerializerTests["serializeCheckout<br/>URL round-trip fidelity"]
    end

    subgraph E2E["End-to-End (Playwright)"]
        CheckoutFlow["Full checkout pipeline<br/>fill forms -> submit -> confirm"]
        URLState["URL state persistence<br/>refresh preserves data"]
        ErrorStates["Validation error display"]
    end

    Unit --> Integration --> E2E
```

## Package Test Matrix

| Package | Test Type | What to Test |
|---|---|---|
| `@repo/entities` | Unit | Every Zod schema: valid data passes, invalid data rejects with correct errors |
| `@repo/entities` | Unit | Parser serialization: `serializeCheckout` produces correct query strings |
| `@repo/entities` | Unit | Parser deserialization: URL params reconstruct to correct typed objects |
| `@repo/ui` | Unit | Components render with expected CSS module classes |
| `@repo/ui` | Unit | FormField shows error/description states correctly |
| `@repo/logic` (planned) | Integration | EffectTS pipelines: compose validation -> enrichment -> processing |
| `@repo/logic` (planned) | Integration | Error channel propagation: service failures produce typed errors |
| Server Actions | Integration | `submitBuyerAction` validates and returns correct `FormState` |
| Server Actions | Integration | `submitCheckoutAction` serializes and redirects correctly |
| App | E2E | Complete checkout flow from empty URL to confirmation |

## Test Directory Structure (Planned)

```
tests/
  packages/
    entities/
      schemas.test.ts        -- Zod schema validation
      parsers.test.ts        -- nuqs round-trip tests
    ui/
      button.test.tsx        -- Component rendering
      form-field.test.tsx    -- Error state rendering
    logic/                   -- EffectTS pipeline tests
      checkout-pipeline.test.ts
  integration/
    actions.test.ts          -- Server action FormData tests
    serialization.test.ts    -- URL round-trip fidelity
  e2e/
    checkout.spec.ts         -- Playwright full-flow test
    url-state.spec.ts        -- Refresh persistence test
```
