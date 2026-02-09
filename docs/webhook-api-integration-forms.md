# Webhook & API Integration Forms

## Overview

These onboarding templates let merchants and developers self-serve integration settings, webhook subscriptions, API key lifecycle actions, and automation endpoints. All forms use the shared onboarding template system and submit through `POST /api/onboarding`.

## Templates

### Webhook Configuration (`webhook-config`)

Use this form to register a webhook callback URL, signing secret, and event subscriptions.

**Key Fields**
- `callbackUrl` (url) - HTTPS endpoint to receive events
- `eventSubscriptions` (multi_select) - Comma-separated values submitted (example: `order.created,order.paid`)
- `signingSecret` (password) - Shared secret for signature verification
- `deliveryMode` (select) - Retry behavior

### API Key Management (`api-key-management`)

Use this form to create, rotate, or revoke API keys and their scopes.

**Key Fields**
- `action` (select) - create, rotate, revoke
- `scopes` (multi_select) - Permissions for the key
- `ipAllowlist` (textarea) - Optional IP allowlist

### Automation Endpoints (`automation-endpoints`)

Use this form to configure automation callbacks and feature toggles.

**Key Fields**
- `enabledAutomations` (multi_select) - Enabled workflow toggles
- `statusCallbackUrl` (url) - Optional status updates endpoint
- `retryMode` (select) - Failure handling strategy

## Webhook Delivery

When `NEXT_PUBLIC_SITE_URL` is set, these templates default to sending configuration changes to:

```
POST /api/webhooks/integration-config
```

**Webhook Events**
- `integration.webhooks.updated`
- `integration.api_keys.updated`
- `integration.config_updated`
- `automation.config_updated`

**Payload Example**

```json
{
  "event": "integration.webhooks.updated",
  "templateId": "webhook-config",
  "category": "integration",
  "regions": ["global"],
  "values": {
    "webhookName": "Order updates",
    "callbackUrl": "https://api.example.com/webhooks/ucp",
    "eventSubscriptions": "order.created,order.paid",
    "signingSecret": "whsec_...",
    "deliveryMode": "at_least_once"
  },
  "submittedAt": "2026-02-08T12:00:00.000Z"
}
```

## Example Submissions

### Webhook Configuration

```json
{
  "templateId": "webhook-config",
  "values": {
    "webhookName": "Order status updates",
    "callbackUrl": "https://api.example.com/webhooks/ucp",
    "eventSubscriptions": "order.created,order.paid,order.fulfilled",
    "signingSecret": "whsec_123",
    "deliveryMode": "at_least_once",
    "maxRetryAttempts": "5"
  },
  "status": "submitted"
}
```

### API Key Management

```json
{
  "templateId": "api-key-management",
  "values": {
    "action": "rotate",
    "keyName": "Production key",
    "keyId": "key_123",
    "environment": "production",
    "scopes": "payments.read,payments.write,webhooks.read",
    "notificationEmail": "devops@example.com"
  },
  "status": "submitted"
}
```
