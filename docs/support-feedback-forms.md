# Support & Feedback Forms

## Overview

The platform includes support ticketing and feedback/review forms for both customers and merchants, integrated into the onboarding template system. All forms use the dynamic `OnboardingForm` renderer and are accessible from the onboarding page under the **Support & Tickets** and **Feedback & Reviews** categories.

## Templates

### Support Tickets

| Template ID | Name | Category | Audience |
|---|---|---|---|
| `support-ticket-customer` | Customer Support Ticket | `support` | Customer |
| `support-ticket-merchant` | Merchant Support Ticket | `support` | Merchant |

### Feedback & Reviews

| Template ID | Name | Category | Audience |
|---|---|---|---|
| `feedback-review-customer` | Customer Feedback & Review | `feedback` | Customer |
| `feedback-merchant-platform` | Merchant Platform Feedback | `feedback` | Merchant |

## Customer Support Ticket

Allows customers to report issues with orders, payments, delivery, and account access.

**Form Groups:**
- **Ticket Details** — Subject, issue type, priority, optional order ID
- **Details** — Full issue description, reproduction steps
- **Contact** — Email (required), phone (optional)
- **Attachments** — Screenshot or document upload
- **Consent** — Agreement to be contacted

**Issue Types:** Order Issue, Payment Problem, Delivery/Shipping, Product Defect, Account Access, Billing Question, Technical Problem, Other

**Priority Levels:** Low, Normal, High, Critical

### Example Submission

```json
{
  "templateId": "support-ticket-customer",
  "values": {
    "ticketSubject": "Missing item in my order",
    "issueType": "order_issue",
    "priority": "high",
    "orderId": "ord_abc123",
    "description": "I ordered 3 items but only received 2. The blue widget is missing from the package.",
    "contactEmail": "buyer@example.com",
    "consentContact": "true"
  },
  "status": "submitted"
}
```

## Merchant Support Ticket

Allows merchants to report platform issues, integration problems, payout questions, and customer escalations.

**Form Groups:**
- **Ticket Details** — Subject, issue type, priority, merchant ID, affected service
- **Details** — Issue description, error logs, affected transaction IDs
- **Contact** — Email (required), phone (optional)
- **Attachments** — Evidence upload
- **Consent** — Authorization confirmation

**Issue Types:** Integration/API, Payout, Webhook, Dashboard, Customer Escalation, Compliance, Billing, Feature Request, Other

**Affected Services:** Stripe, PayPal MX, MercadoPago, ComproPago, STP, Thirdweb, Shopify, Polar, Platform

### Example Submission

```json
{
  "templateId": "support-ticket-merchant",
  "values": {
    "ticketSubject": "Webhooks not being delivered",
    "issueType": "webhook",
    "priority": "high",
    "merchantId": "merch_xyz789",
    "affectedService": "stripe",
    "description": "Stripe webhooks stopped arriving at our endpoint since yesterday. No changes on our end.",
    "errorLogs": "Last webhook received: 2026-02-07T10:00:00Z. Stripe dashboard shows 15 failed deliveries.",
    "contactEmail": "ops@merchant.com",
    "consentOps": "true"
  },
  "status": "submitted"
}
```

## Customer Feedback & Review

Post-purchase feedback form for customers to rate products, checkout experience, and delivery.

**Form Groups:**
- **Order Reference** — Order ID
- **Ratings** — Overall (required), product quality, checkout experience, delivery
- **Review** — Title, comments, would-recommend (required)
- **Attachments** — Product photo
- **Contact** — Email for follow-up (optional)
- **Consent** — Agreement to publish review

**Rating Scale:** 1-5 stars for each dimension

### Example Submission

```json
{
  "templateId": "feedback-review-customer",
  "values": {
    "orderId": "ord_abc123",
    "overallRating": "5",
    "productRating": "4",
    "checkoutExperienceRating": "5",
    "reviewTitle": "Great experience!",
    "reviewComments": "Fast delivery and the product quality exceeded my expectations.",
    "wouldRecommend": "yes",
    "consentPublish": "true"
  },
  "status": "submitted"
}
```

## Merchant Platform Feedback

Allows merchants to rate and provide feedback on the platform itself.

**Form Groups:**
- **Merchant Info** — Merchant ID, feedback area
- **Ratings** — Overall satisfaction (required), ease of use
- **Comments** — What works well, what needs improvement, feature requests, would-recommend
- **Contact** — Email for follow-up (optional)
- **Consent** — Agreement to use feedback for improvements

### Example Submission

```json
{
  "templateId": "feedback-merchant-platform",
  "values": {
    "merchantId": "merch_xyz789",
    "feedbackArea": "api",
    "overallSatisfaction": "4",
    "easeOfUse": "3",
    "whatWorksWell": "The payment processing is reliable and fast.",
    "whatNeedsImprovement": "API documentation could use more examples for edge cases.",
    "featureRequest": "Batch payout API endpoint",
    "wouldRecommend": "yes",
    "consentFeedback": "true"
  },
  "status": "submitted"
}
```

## Entity Schemas

### SupportTicket

Tracks the full lifecycle of a support ticket including status, messages, and resolution.

```typescript
import { SupportTicketSchema } from "@repo/entities";

// Fields: id, subject, status, priority, issueType, createdBy, creatorId,
//         orderId?, merchantId?, templateId, messages[], tags[],
//         createdAt, updatedAt, resolvedAt?, resolutionSummary?
```

**Statuses:** `open` → `in_progress` → `waiting_on_customer` | `waiting_on_merchant` | `escalated` → `resolved` → `closed`

### TicketMessage

Individual messages in a ticket communication thread.

```typescript
import { TicketMessageSchema } from "@repo/entities";

// Fields: id, ticketId, senderRole, senderId, content, contentType,
//         attachments?, createdAt, internal
```

**Sender Roles:** `customer`, `merchant`, `support_agent`, `system`

### FeedbackRecord

Structured feedback/review data linked to orders and merchants.

```typescript
import { FeedbackRecordSchema } from "@repo/entities";

// Fields: id, orderId?, merchantId?, submittedBy, submitterId, templateId,
//         overallRating, ratings?, title?, comments?, wouldRecommend,
//         attachments?, published, createdAt, updatedAt
```

## API Integration

Support tickets and feedback forms submit through the standard onboarding API:

```
POST /api/onboarding
Content-Type: application/json

{
  "templateId": "support-ticket-customer",
  "values": { ... },
  "status": "submitted",
  "updatedAt": "2026-02-08T00:00:00.000Z"
}
```

The `templateId` determines routing — support tickets create `SupportTicket` records while feedback submissions create `FeedbackRecord` entries.
