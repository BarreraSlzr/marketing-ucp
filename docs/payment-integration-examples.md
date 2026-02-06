# UCP Payment & Integration Examples

## Overview

This guide provides step-by-step examples for integrating different payment handlers and connecting external services (Shopify, Polar) with UCP.

## Quick Start: Setting Up Payment Handlers

### 1. Register Handlers in Your App

```typescript
// app/lib/payment-setup.ts
import { registerPaymentHandler } from "@repo/entities";
import { StripePaymentHandler } from "@repo/entities/adapters/stripe";
import { PolarPaymentHandler } from "@repo/entities/adapters/polar";
import { ThirdwebPaymentHandler } from "@repo/entities/adapters/thirdweb";

export function initializePaymentHandlers() {
  // Stripe (Web2 - Card Payments)
  if (process.env.STRIPE_API_KEY) {
    registerPaymentHandler(
      "stripe",
      new StripePaymentHandler(
        process.env.STRIPE_API_KEY,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    );
  }

  // Polar (Web2 - Subscriptions)
  if (process.env.POLAR_API_KEY) {
    registerPaymentHandler(
      "polar",
      new PolarPaymentHandler(
        process.env.POLAR_API_KEY,
        process.env.POLAR_WEBHOOK_SECRET!
      )
    );
  }

  // Thirdweb (Web3 - Crypto)
  if (process.env.THIRDWEB_API_KEY) {
    registerPaymentHandler(
      "thirdweb",
      new ThirdwebPaymentHandler(
        process.env.THIRDWEB_API_KEY,
        process.env.THIRDWEB_WEBHOOK_SECRET!,
        1 // Ethereum mainnet
      )
    );
  }
}

// Call during app initialization
initializePaymentHandlers();
```

### 2. Environment Configuration

```bash
# .env.local (never commit!)
# Stripe
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Polar
POLAR_API_KEY=...
POLAR_WEBHOOK_SECRET=...

# Thirdweb
THIRDWEB_API_KEY=...
THIRDWEB_WEBHOOK_SECRET=...
THIRDWEB_CHAIN_ID=1

# Shopify
SHOPIFY_API_TOKEN=...
SHOPIFY_STORE_NAME=mystore

# Database
DATABASE_URL=postgresql://...
```

## Example 1: Stripe Card Payment Flow

```typescript
// Scenario: User completes checkout with Stripe card payment

import { getPaymentHandler } from "@repo/entities";
import type { Order } from "@repo/entities";

async function processCheckoutWithStripe(order: Order) {
  const handler = getPaymentHandler("stripe");
  if (!handler) throw new Error("Stripe handler not configured");

  // Create payment session
  const { sessionId, paymentUrl } = await handler.createPaymentSession(order);

  // Redirect user to Stripe Checkout
  redirect(paymentUrl!);

  // User completes payment on Stripe
  // Stripe sends webhook: checkout.session.completed
  // Our webhook route processes it and updates order.status = "confirmed"
  // Fulfillment triggered automatically
}
```

## Example 2: Polar Subscription Flow

```typescript
// Scenario: User subscribes to SaaS product via Polar

import { getPaymentHandler } from "@repo/entities";
import type { Order } from "@repo/entities";

async function processSubscriptionWithPolar(order: Order) {
  const handler = getPaymentHandler("polar");
  if (!handler) throw new Error("Polar handler not configured");

  // Create payment session
  const { paymentUrl, metadata } = await handler.createPaymentSession(order);

  // Polar webhook sequence:
  // 1. order.created → order.status = "pending"
  // 2. payment.confirmed → order.status = "confirmed"
  // 3. subscription active → send welcome email

  redirect(paymentUrl!);
}
```

## Example 3: Web3 Crypto Payment with Thirdweb

```typescript
// Scenario: User pays with USDC (stablecoin) via Thirdweb

import { getPaymentHandler } from "@repo/entities";
import type { Order } from "@repo/entities";

async function processPaymentWithThirdweb(
  order: Order,
  walletAddress: string
) {
  const handler = getPaymentHandler("thirdweb");
  if (!handler) throw new Error("Thirdweb handler not configured");

  // Create payment session with USDC (Ethereum)
  const { paymentUrl, metadata } = await handler.createPaymentSession({
    ...order,
    metadata: {
      ...order.metadata,
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC Ethereum
      recipientAddress: "0x...", // Your wallet
      walletAddress, // User's wallet
    },
  });

  // User confirms payment in wallet
  // Thirdweb sends webhook: payment.confirmed
  // Webhook includes transactionHash for verification
  // order.status = "confirmed", transactionHash stored
}
```

## Example 4: Shopify Integration

```typescript
// Scenario: Sync purchased items to Shopify for fulfillment

import type { Order } from "@repo/entities";

async function syncOrderToShopify(order: Order) {
  const shopifyToken = process.env.SHOPIFY_API_TOKEN;
  const shopifyStore = process.env.SHOPIFY_STORE_NAME;

  const graphql = `
    mutation CreateOrder {
      orderCreate(input: {
        email: "${order.buyer?.email}"
        lineItems: [
          ${order.line_items.map((item) => `{
            title: "${item.name}"
            quantity: ${item.quantity}
            price: ${item.unit_price / 100}
          }`).join(",")}
        ]
        shippingAddress: {
          address1: "${order.buyer?.shipping_address?.address_line_1}"
          city: "${order.buyer?.shipping_address?.city}"
          country: "${order.buyer?.shipping_address?.country}"
        }
      }) {
        order {
          id
          name
        }
      }
    }
  `;

  const response = await fetch(
    `https://${shopifyStore}.myshopify.com/admin/api/2024-01/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": shopifyToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: graphql }),
    }
  );

  const result = await response.json();
  const shopifyOrderId = result.data.orderCreate.order.id;

  // Store mapping for future reference
  await db.orders.update(order.id, {
    external_id: shopifyOrderId,
  });
}
```

## Example 5: Multi-Handler Decision Logic

```typescript
// Scenario: Choose payment handler based on product type

import { getPaymentHandler } from "@repo/entities";
import type { Order, Checkout } from "@repo/entities";

async function selectPaymentHandler(
  checkout: Checkout,
  order: Order,
  userPreference?: string
): Promise<string> {
  // User explicitly chose a handler
  if (userPreference) {
    return userPreference;
  }

  // Product-based routing
  const hasSubscription = order.line_items.some(
    (item) => item.metadata?.type === "subscription"
  );
  if (hasSubscription) {
    return "polar"; // Polar is better for subscriptions
  }

  // Buyer location-based routing
  if (order.buyer?.shipping_address?.country === "ET") {
    // Ethiopia - some regions may have limited card support
    return "thirdweb"; // Offer crypto alternative
  }

  // Default: Stripe for standard products
  return "stripe";
}

// Usage in checkout
const selectedHandler = await selectPaymentHandler(checkout, order);
const handler = getPaymentHandler(selectedHandler)!;
const { paymentUrl } = await handler.createPaymentSession(order);
redirect(paymentUrl);
```

## Example 6: Webhook Retry & Resilience

```typescript
// Handle failed webhook processing with exponential backoff

interface WebhookRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

async function processWebhookWithRetry(
  event: WebhookEvent,
  config: WebhookRetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
  }
) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const handler = getPaymentHandler(event.source);
      if (!handler) throw new Error(`Handler ${event.source} not found`);

      const orderUpdate = await handler.processWebhookEvent(event);

      // Update order
      await db.orders.update(orderUpdate.id, orderUpdate);

      // Log success
      await db.webhookEvents.create({
        externalId: event.id,
        status: "success",
        processedAt: new Date(),
      });

      return; // Success!
    } catch (error) {
      lastError = error as Error;

      if (attempt < config.maxRetries) {
        const delayMs =
          config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
        console.warn(
          `Webhook retry ${attempt + 1}/${config.maxRetries} in ${delayMs}ms:`,
          error
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error("Webhook processing failed after retries:", {
    eventId: event.id,
    error: lastError?.message,
  });

  await db.webhookEvents.create({
    externalId: event.id,
    status: "failed",
    error: lastError?.message,
  });

  // Alert team
  await notifyTeam(`Webhook failed: ${event.id}`);
}
```

## Example 7: Order State Machine

```typescript
// Enforce valid order state transitions

type OrderState =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "failed"
  | "refunded"
  | "canceled";

const validTransitions: Record<OrderState, OrderState[]> = {
  pending: ["processing", "canceled"],
  processing: ["confirmed", "failed"],
  confirmed: ["shipped", "refunded"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  failed: ["pending", "canceled"],
  refunded: [],
  canceled: [],
};

function canTransition(from: OrderState, to: OrderState): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}

async function updateOrderStatus(
  orderId: string,
  newStatus: OrderState
): Promise<void> {
  const order = await db.orders.findById(orderId);
  const currentStatus = order.status;

  if (!canTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid transition: ${currentStatus} → ${newStatus}`
    );
  }

  await db.orders.update(orderId, {
    status: newStatus,
    updated_at: new Date(),
  });

  // Trigger side effects
  if (newStatus === "confirmed") {
    await syncOrderToShopify(order);
  } else if (newStatus === "shipped") {
    await notifyBuyerOfShipment(order);
  }
}
```

## Testing Webhooks Locally

### Using ngrok to expose localhost

```bash
# Start ngrok tunnel
ngrok http 3000

# Get public URL like: https://abc123.ngrok.io
# Configure webhook URL in payment provider dashboard:
# https://abc123.ngrok.io/api/webhooks/payment?provider=stripe
```

### Using Stripe CLI

```bash
# Listen for Stripe events locally
stripe listen --forward-to localhost:3000/api/webhooks/payment?provider=stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Manual webhook testing

```bash
curl -X POST http://localhost:3000/api/webhooks/payment?provider=stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1234567890,v1=signature" \
  -d '{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "payment_intent": "pi_test_123"
      }
    }
  }'
```

## References

- [UCP Specification](https://ucp.dev)
- [Stripe Payment Intents](https://stripe.com/docs/payments/payment-intents)
- [Polar Documentation](https://docs.polar.sh)
- [Thirdweb Pay](https://thirdweb.com/pay)
- [Shopify GraphQL API](https://shopify.dev/docs/api/admin-graphql)
