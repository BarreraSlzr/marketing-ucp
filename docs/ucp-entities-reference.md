# UCP Entities & Services Reference

## Entity Model Overview

This document provides a comprehensive reference of all UCP entities and how they connect across the system.

## Core Entities

### 1. **Checkout** (checkout.zod.ts)
The root entity for a shopping session. Contains all information needed to process a transaction.

```
Checkout
├── id: string (session ID)
├── line_items: LineItem[]
├── buyer: Buyer (optional)
├── payment: Payment (optional)
├── status: CheckoutStatus ("incomplete" | "ready_for_complete" | "completed" | ...)
├── totals: Total[]
├── messages: Message[] (validation errors)
├── links: Link[] (T&Cs, Privacy Policy)
├── currency: string (ISO 4217, e.g., "USD")
└── expires_at: DateTime (optional)
```

### 2. **Order** (order.zod.ts) - NEW
Extended checkout tracking order fulfillment and lifecycle.

```
Order
├── id: string
├── checkout_id: string (reference to original checkout)
├── status: OrderStatus ("pending" | "confirmed" | "shipped" | "delivered" | ...)
├── buyer: Buyer
├── line_items: LineItem[]
├── totals: Total[]
├── payment: Payment
├── tracking_number: string (fulfillment)
├── external_id: string (Shopify order ID, etc.)
├── metadata: Record<string, any>
├── created_at: DateTime
└── updated_at: DateTime
```

### 3. **Buyer** (buyer.zod.ts)
Customer information.

```
Buyer
├── email: string
├── phone: string
├── first_name: string
├── last_name: string
├── billing_address: PostalAddress
└── shipping_address: PostalAddress
```

### 4. **Payment** (payment.zod.ts)
Payment method and credentials.

```
Payment
├── handler: string ("stripe" | "polar" | "thirdweb" | custom)
├── credential: PaymentCredential (discriminated union)
│  ├── type: "token" → { token: string }
│  └── type: "card" → { card_number, expiry, brand }
└── billing_address: PostalAddress
```

### 5. **LineItem** (line-item.zod.ts)
Individual products/services in the cart.

```
LineItem
├── id: string
├── name: string
├── description: string (optional)
├── quantity: number
├── unit_price: number (in cents)
├── sku: string
├── image_url: string (optional)
└── metadata: Record<string, any>
```

### 6. **PostalAddress** (postal-address.zod.ts)
Standardized address format.

```
PostalAddress
├── address_line_1: string
├── address_line_2: string (optional)
├── city: string
├── state_or_province: string
├── postal_code: string
└── country: string (ISO 3166-1 alpha-2)
```

### 7. **Total** (total.zod.ts)
Pricing breakdown.

```
Total
├── type: "subtotal" | "discount" | "tax" | "shipping" | "total"
├── amount: number (in cents)
├── currency: string
└── description: string (optional)
```

### 8. **Message** (message.zod.ts)
Validation messages and errors.

```
Message
├── id: string
├── type: "error" | "warning" | "info"
├── message: string
├── field: string (optional - which field has the error)
└── code: string (machine-readable error code)
```

### 9. **Link** (link.zod.ts)
Legal/informational links.

```
Link
├── rel: string ("terms" | "privacy" | "about" | ...)
├── href: string (URL)
└── title: string (display text)
```

### 10. **WebhookEvent** (webhook.zod.ts) - NEW
Event notifications from payment providers.

```
WebhookEvent
├── id: string
├── type: WebhookEventType
│  ├── "order.created" | "order.confirmed" | "order.shipped"
│  ├── "payment.confirmed" | "payment.failed" | "payment.refunded"
│  └── "discount.applied" | "tax.calculated"
├── source: "stripe" | "polar" | "shopify" | "thirdweb" | "custom"
├── timestamp: DateTime
├── order: Order (optional)
├── data: Record<string, any> (provider-specific payload)
└── signature: string (HMAC verification)
```

## Service Layer

### PaymentHandler Interface

All payment providers implement this interface for UCP integration:

```typescript
interface PaymentHandler {
  createPaymentSession(order: Order): Promise<{
    sessionId: string;
    clientSecret?: string;
    paymentUrl?: string;
    metadata?: Record<string, unknown>;
  }>;

  verifyWebhookSignature(body: string, signature: string): Promise<boolean>;
  processWebhookEvent(event: WebhookEvent): Promise<Partial<Order>>;
  cancelPayment(orderId: string, amount?: number): Promise<...>;
  getPaymentStatus(orderId: string): Promise<...>;
}
```

### Available Handlers

| Handler | Type | Use Case | Status |
|---------|------|----------|--------|
| Stripe | Web2 | Card payments, wallets | ✅ Implemented |
| Polar | Web2 | Subscriptions, digital products | ✅ Implemented |
| Thirdweb | Web3 | Crypto, USDC, NFTs | ✅ Implemented |
| Shopify | Web2 | Storefront fulfillment | 📋 Example provided |
| Custom | Any | Your provider | 📖 API documented |

## Data Flow Diagrams

### Checkout → Order → Fulfillment

```
User fills checkout form (Buyer, Addresses, Payment)
            ↓
    Select payment handler
            ↓
    Validate & create Order
            ↓
    PaymentHandler.createPaymentSession()
            ↓
    Redirect to payment provider (Stripe/Polar/Thirdweb)
            ↓
    User completes payment
            ↓
    Provider sends webhook event
            ↓
    /api/webhooks/payment verifies & processes
            ↓
    Order.status = "confirmed"
            ↓
    Sync to fulfillment (Shopify, etc.)
            ↓
    Order.status = "shipped" → "delivered"
```

### Webhook Processing with Retries

```
WebhookEvent received
            ↓
    Verify signature
            ↓
    PaymentHandler.processWebhookEvent()
            ↓
    Update Order in database
            ↓
    Log success
            ↓
[Exception]
            ↓
    Retry with backoff (1s, 2s, 4s)
            ↓
    After 3 retries: alert team
```

## Integration Patterns

### Pattern 1: Payment Handler Registration

```typescript
// Register at app startup
import { registerPaymentHandler } from "@repo/entities";

registerPaymentHandler("stripe", new StripePaymentHandler(...));
registerPaymentHandler("polar", new PolarPaymentHandler(...));
registerPaymentHandler("thirdweb", new ThirdwebPaymentHandler(...));
```

### Pattern 2: Smart Handler Selection

```typescript
// Choose handler based on product/buyer/preference
function selectHandler(checkout: Checkout): string {
  if (checkout.line_items.some(isSubscription)) return "polar";
  if (buyer.country === "ET") return "thirdweb"; // crypto-friendly
  return "stripe"; // default
}
```

### Pattern 3: Multi-Step State Validation

```
Order.status flow:
pending → processing → confirmed → shipped → delivered

Valid transitions enforced by state machine.
All state changes logged for audit trail.
```

## URL Serialization with nuqs

All checkout data can be serialized into URL search params for stateless, shareable checkout links.

```typescript
import { serializeCheckout } from "@repo/entities";

const params = serializeCheckout("/checkout", {
  buyer_email: "user@example.com",
  buyer_first_name: "Alice",
        line_items: [
                {
                        id: "item_001",
                        name: "Starter Plan",
                        quantity: 1,
                        unit_price: 2500,
                        total_price: 2500,
                },
        ],
  // ... all checkout fields
});

// Generate shareable link
const checkoutLink = params;
// /checkout?buyer_email=user%40example.com&buyer_first_name=Alice&...
```

## Security & Compliance

### Webhook Verification
✅ All webhooks verified by signature (HMAC-SHA256)
✅ Only processed webhooks are persisted
✅ Idempotency key prevents duplicate charges

### PCI-DSS Compliance
✅ Payment tokens (no card storage)
✅ External PSPs handle sensitive data
✅ No card numbers in logs/database

### Access Control
✅ API keys stored in environment variables only
✅ Webhook secrets never exposed to client
✅ Server-side payment handler registration

## Environment Setup Checklist

```bash
☐ STRIPE_API_KEY
☐ STRIPE_WEBHOOK_SECRET
☐ POLAR_API_KEY
☐ POLAR_WEBHOOK_SECRET
☐ THIRDWEB_API_KEY
☐ THIRDWEB_WEBHOOK_SECRET
☐ DATABASE_URL (for order persistence)
☐ SHOPIFY_API_TOKEN (optional, for fulfillment)
```

## Testing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/payment?provider=stripe` | POST | Receive Stripe webhooks |
| `/api/webhooks/payment?provider=polar` | POST | Receive Polar webhooks |
| `/api/webhooks/payment?provider=thirdweb` | POST | Receive Thirdweb webhooks |
| `/api/webhooks/payment` | GET | Health check & list handlers |

## Next Steps

1. **Extend with Custom Handlers**: Implement `PaymentHandler` for your PSP
2. **Add Order Database**: Persist orders with webhook states
3. **Build Admin Dashboard**: Monitor orders, refunds, chargebacks
4. **Integrate with Shopify/WooCommerce**: Sync fulfillment status
5. **Add Discount/Tax Services**: Extend webhook processing
6. **Implement Loyalty Programs**: Track order history per buyer

## References

- [UCP Specification](https://ucp.dev)
- [Payment Handler Guide](../payment-handlers.md)
- [Integration Examples](../payment-integration-examples.md)
- [Stripe API](https://stripe.com/docs/api)
- [Polar API](https://docs.polar.sh)
- [Thirdweb SDK](https://thirdweb.com/sdk)
