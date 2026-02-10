# Cross-Platform Integration Guide

This guide explains how to integrate new payment providers and fulfillment platforms with UCP's cross-platform session bridge.

## Overview

The cross-platform bridge enables linking internal UCP sessions with external platform identifiers (Stripe PaymentIntents, Shopify Orders, etc.), providing a unified audit trail across all platforms.

## Architecture

```
Internal Session (UCP) ←→ Cross-Platform Bridge ←→ External Platform
          │                         │                       │
    sessionId: abc123        KV Storage Links        Stripe: pi_xyz
                                    │                Shopify: order_456
                                    │                Custom: txn_789
```

## Adding a New Platform Integration

### 1. Create Platform Bridge File

Create `packages/pipeline/integrations/{platform}-bridge.ts`:

```typescript
import Stripe from "stripe";

// LEGEND: {Platform} integration bridge
// Links internal sessions with {Platform} identifiers
// All usage must comply with this LEGEND and the LICENSE

const client = new PlatformSDK({
  apiKey: process.env.PLATFORM_API_KEY!,
});

interface LinkSessionParams {
  sessionId: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Link internal session to {Platform} transaction
 */
export async function linkPlatformSession(
  params: LinkSessionParams
): Promise<void> {
  const { linkSessionToPlatform } = await import("../cross-platform-bridge");
  
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "{platform}", // lowercase platform identifier
    externalId: params.externalId,
    metadata: params.metadata,
  });
}

interface FetchExternalDataParams {
  externalId: string;
}

/**
 * Fetch transaction data from {Platform} API
 * Called by cross-platform bridge when merging session data
 */
export async function fetchExternalData(
  params: FetchExternalDataParams
): Promise<unknown> {
  try {
    const transaction = await client.transactions.retrieve(params.externalId, {
      expand: ["customer", "related_objects"], // Expand nested objects
    });
    
    return {
      id: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      created: new Date(transaction.created * 1000).toISOString(),
      customer: transaction.customer,
      // Map platform-specific fields to common format
    };
  } catch (error) {
    console.error(`Failed to fetch {Platform} data:`, error);
    throw error;
  }
}

/**
 * Get audit trail from {Platform}
 * Fetches full event history for transaction
 */
export async function getPlatformAuditTrail(
  params: FetchExternalDataParams
): Promise<unknown[]> {
  const events = await client.events.list({
    type: "{platform}.transaction.*",
    related_object: params.externalId,
  });
  
  return events.data.map((event) => ({
    id: event.id,
    type: event.type,
    created: new Date(event.created * 1000).toISOString(),
    data: event.data,
  }));
}
```

### 2. Environment Configuration

Add platform credentials to `.env.local`:

```bash
# {Platform} Integration
PLATFORM_API_KEY=your_api_key
PLATFORM_WEBHOOK_SECRET=whsec_...
```

### 3. Link Sessions During Workflow Execution

In your payment handler or webhook processor, link sessions:

```typescript
import { linkPlatformSession } from "@repo/pipeline/integrations/{platform}-bridge";

// After creating external transaction
await linkPlatformSession({
  sessionId: session.id, // Internal UCP session
  externalId: transaction.id, // External platform ID
  metadata: {
    workflowId: "checkout_baseline",
    createdBy: "payment_handler",
  },
});
```

### 4. Test Integration

#### Manual Testing

1. Create a test sessionworkflow (e.g., `test-session-123`)
2. Link to external platform:
   ```typescript
   await linkPlatformSession({
     sessionId: "test-session-123",
     externalId: "pi_test_xyz",
   });
   ```
3. Navigate to workflow detail page
4. Filter events by session ID
5. Verify external platform card appears

#### API Testing

```bash
# Fetch cross-platform data
curl "http://localhost:3000/api/pipeline/cross-platform?sessionId=test-session-123&platform={platform}"

# Response:
{
  "sessionId": "test-session-123",
  "workflowId": "checkout_baseline",
  "internalEvents": [...],
  "externalData": {
    "{platform}": {
      "id": "pi_test_xyz",
      "status": "succeeded",
      "amount": 5000,
      "currency": "usd"
    }
  }
}
```

### 5. Handle Webhooks (Optional)

If the platform sends webhooks, create a handler to auto-link sessions:

```typescript
// app/api/webhooks/{platform}/route.ts
import { linkPlatformSession } from "@repo/pipeline/integrations/{platform}-bridge";

export async function POST(req: Request) {
  const event = await verifyWebhook(req);
  
  // Extract session ID from webhook metadata
  const sessionId = event.data.object.metadata?.ucp_session_id;
  
  if (sessionId) {
    await linkPlatformSession({
      sessionId,
      externalId: event.data.object.id,
      metadata: {
        webhook_event: event.type,
      },
    });
  }
  
  return new Response("OK", { status: 200 });
}
```

## Platform Integration Checklist

- [ ] Create `{platform}-bridge.ts` with `linkPlatformSession()` and `fetchExternalData()`
- [ ] Add environment variables for API credentials
- [ ] Implement session linking in payment handler/webhook
- [ ] Test manual linking via API endpoint
- [ ] Verify UI displays platform card correctly
- [ ] Handle authentication errors gracefully
- [ ] Document platform-specific configuration
- [ ] Add audit trail fetching (optional)
- [ ] Set up webhook handler for auto-linking (optional)

## Existing Integrations

### Stripe (`stripe-bridge.ts`)
- Links PaymentIntents and Invoices
- Fetches expanded customer and payment method data
- Uses API version `2025-02-24.acacia`

### Shopify (`shopify-bridge.ts`)
- Links Orders and Checkouts
- Fetches order fulfillment status
- Uses Admin API v2024-01

## Best Practices

### 1. Error Handling
Always handle API failures gracefully:
```typescript
try {
  return await client.fetch(id);
} catch (error) {
  console.warn(`Failed to fetch {Platform} data:`, error);
  return { error: "Failed to fetch", details: error.message };
}
```

### 2. Data Mapping
Map platform-specific fields to common schema:
```typescript
return {
  id: transaction.id,
  status: mapStatus(transaction.state), // Normalize statuses
  amount: transaction.amount_cents / 100, // Normalize currency
  currency: transaction.currency?.toLowerCase(),
  created: new Date(transaction.created_at).toISOString(),
};
```

### 3. Expand Nested Objects
Fetch complete data in one request:
```typescript
const payment = await stripe.paymentIntents.retrieve(id, {
  expand: ["customer", "payment_method", "invoice"],
});
```

### 4. Audit Events
Emit platform link events for observability:
```typescript
await kv.lpush("cross-platform:events", {
  type: "cross_platform_link_created",
  sessionId,
  platform: "{platform}",
  externalId,
  timestamp: new Date().toISOString(),
});
```

### 5. Metadata Storage
Include context when linking:
```typescript
await linkPlatformSession({
  sessionId,
  externalId,
  metadata: {
    workflowId: "checkout_baseline",
    handler: "stripe_handler",
    environment: process.env.NODE_ENV,
  },
});
```

## Troubleshooting

### Platform card not appearing
1. Verify session is linked: `await getLinkedPlatforms({ sessionId })`
2. Check API credentials are configured
3. Verify `fetchExternalData()` doesn't throw errors
4. Check browser console for SWR errors

### API returns 500 error
1. Verify platform SDK is installed
2. Check environment variables are set
3. Test API credentials directly
4. Review server logs for detailed error

### Stale data displayed
- CrossPlatformData polls every 5 seconds
- Force refresh by changing session ID filter
- Check platform API rate limits

## API Reference

### Core Functions

```typescript
// Link session to external platform
linkSessionToPlatform(params: {
  sessionId: string;
  platform: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;

// Get all linked platforms for session
getLinkedPlatforms(params: {
  sessionId: string;
}): Promise<CrossPlatformLink[]>;

// Find session by external ID
getSessionByExternalId(params: {
  platform: string;
  externalId: string;
}): Promise<CrossPlatformLink | null>;

// Fetch unified session data
getCrossPlatformSessionData(params: {
  sessionId: string;
  platforms?: string[];
}): Promise<CrossPlatformSessionData>;
```

### Platform Bridge Interface

```typescript
// Required exports for each platform bridge
export async function linkPlatformSession(params: {
  sessionId: string;
  externalId: string;
  metadata?: Record<string, unknown>;
}): Promise<void>;

export async function fetchExternalData(params: {
  externalId: string;
}): Promise<unknown>;

// Optional exports
export async function getPlatformAuditTrail(params: {
  externalId: string;
}): Promise<unknown[]>;
```

## Examples

### MercadoPago Integration

```typescript
// packages/pipeline/integrations/mercadopago-bridge.ts
import { MercadoPago } from "mercadopago";

const client = new MercadoPago({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function linkMercadoPagoSession(params: {
  sessionId: string;
  paymentId: string;
}) {
  const { linkSessionToPlatform } = await import("../cross-platform-bridge");
  
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "mercadopago",
    externalId: params.paymentId,
  });
}

export async function fetchExternalData(params: { externalId: string }) {
  const payment = await client.payment.get({ id: parseInt(params.externalId) });
  
  return {
    id: payment.id,
    status: payment.status,
    amount: payment.transaction_amount,
    currency: payment.currency_id,
    payer: payment.payer,
    created: payment.date_created,
  };
}
```

### PayPal Integration

```typescript
// packages/pipeline/integrations/paypal-bridge.ts
import paypal from "@paypal/checkout-server-sdk";

const environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID!,
  process.env.PAYPAL_CLIENT_SECRET!
);
const client = new paypal.core.PayPalHttpClient(environment);

export async function linkPayPalSession(params: {
  sessionId: string;
  orderId: string;
}) {
  const { linkSessionToPlatform } = await import("../cross-platform-bridge");
  
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "paypal",
    externalId: params.orderId,
  });
}

export async function fetchExternalData(params: { externalId: string }) {
  const request = new paypal.orders.OrdersGetRequest(params.externalId);
  const response = await client.execute(request);
  
  return {
    id: response.result.id,
    status: response.result.status,
    amount: response.result.purchase_units[0].amount.value,
    currency: response.result.purchase_units[0].amount.currency_code,
    payer: response.result.payer,
    created: response.result.create_time,
  };
}
```

## Related Documentation

- [Payment Handler Interface](./entities.md#payment-handler)
- [Pipeline Events](./architecture.md#pipeline-events)
- [Webhook Integration](./payment-integration-examples.md)
- [KV Storage Patterns](./workflows.md#kv-storage)
