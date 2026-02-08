# Antifraud Risk Assessment Integration

## Overview

The antifraud risk assessment system is now integrated as a mandatory `fraud_check` step in the UCP checkout pipeline. This step evaluates transaction risk before payment initiation and can block, review, or allow the transaction based on computed risk signals.

## Pipeline Integration

### Pipeline Definitions

The following pipeline types include antifraud as a required step:

- `PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD` - Physical product checkout with fraud checking
- `PIPELINE_CHECKOUT_DIGITAL_ANTIFRAUD` - Digital product checkout with fraud checking  
- `PIPELINE_CHECKOUT_SUBSCRIPTION_ANTIFRAUD` - Subscription checkout with fraud checking

All three define `fraud_check` as a **required step** that must succeed before proceeding to `payment_initiated`.

```typescript
export const PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD: PipelineDefinition = {
  name: "Physical Product Checkout (Antifraud)",
  type: "checkout_physical_antifraud",
  required_steps: [
    "buyer_validated",
    "fraud_check",           // ← Mandatory antifraud step
    "address_validated",
    "payment_initiated",
    // ... more steps
  ],
  optional_steps: [
    "fraud_review_escalated", // ← Emitted when decision is "review"
    // ... more steps
  ],
};
```

## Server Action Flow

The checkout process now includes a fraud check step in the server actions:

```
submitBuyerAction()
  ↓ (buyer_validated)
submitAddressAction()
  ↓ (address_validated)
submitFraudCheckAction()  ← NEW STEP
  ↓ (fraud_check)
submitPaymentAction()
  ↓ (payment_initiated)
```

### `submitFraudCheckAction` Implementation

```typescript
export async function submitFraudCheckAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState>
```

**Input:**
- Form data containing buyer email, IP address, device hash, billing country, etc.

**Processing:**
1. Calls `assessRisk()` with buyer and transaction context
2. RiskEngine evaluates signals (velocity, timing, geo-mismatch, device anomalies, etc.)
3. Computes weighted risk score and makes decision: `allow`, `review`, or `block`

**Output:**
- **Block**: Returns error with signals preventing further checkout
- **Review**: Logs warning for manual review but allows checkout to continue
- **Allow**: Returns success to proceed to payment step

## Risk Assessment

The `RiskEngine.assess()` function evaluates multiple fraud signals:

### Signal Types

| Signal | Description | Threshold |
|--------|-------------|-----------|
| **Velocity** | Transactions per email/device/IP in time window | High frequency = block |
| **Timing** | Abnormal timing patterns between pipeline steps | Suspicious intervals = higher risk |
| **Geo-Mismatch** | IP country ≠ billing country | Distant mismatch = block |
| **Device Anomaly** | Unusual, unrecognized, or spoofed device | Detected anomaly = block |
| **Input Mutation** | Changes to buyer data between validation steps | Unexpected changes = review |
| **Chain Hash** | Integrity check of data chain | Hash mismatch = block |

### Decision Thresholds

```typescript
const ALLOW_THRESHOLD = 30;     // score ≤ 30 → allow
const REVIEW_THRESHOLD = 70;    // 30 < score < 70 → review  
const BLOCK_THRESHOLD = 70;     // score ≥ 70 → block
```

## Pipeline Events

### `fraud_check` Event

Emitted when antifraud assessment completes.

**Example:**
```json
{
  "id": "session123.checkout_digital_antifraud.fraud_check.0",
  "session_id": "session123",
  "pipeline_type": "checkout_digital_antifraud",
  "step": "fraud_check",
  "status": "success",
  "handler": "antifraud",
  "metadata": {
    "decision": "allow",
    "total_score": 25,
    "signals": [
      { "name": "velocity_check", "score": 10, "description": "Normal transaction frequency" },
      { "name": "geo_check", "score": 15, "description": "Matching IP and billing country" }
    ]
  },
  "timestamp": "2026-02-08T12:34:56.789Z"
}
```

### `fraud_review_escalated` Event

Optionally emitted when decision is `review` (for future manual review workflow).

## Dashboard Integration

### Timeline View

The fraud check step appears in the pipeline timeline with:
- Decision indicator (✓ Allow, ⚠ Review, ✗ Block)
- Risk score visualization
- Signal breakdown

**Location:** `/dashboard/pipeline/[id]`

### Event Details

Clicking the fraud check event shows:
- Total risk score
- Individual signal scores and explanations
- Assessment timestamp
- Velocity history for email/device/IP
- Geo and device mismatch details

### Events Page

All fraud check assessments visible at `/dashboard/events` filtered by:
- Pipeline type
- Decision (allow/review/block)
- Score range
- Date range

## Testing

### E2E Tests

Test file: `tests/e2e/fraud-check.pw.ts`

Scenarios:
- ✅ Allow low-risk checkout
- ✅ Block high-risk checkout with clear signals
- ✅ Flag medium-risk for review
- ✅ Display fraud signals in timeline
- ✅ Emit fraud_check event
- ✅ Prevent payment if blocked
- ✅ Detect velocity-based fraud
- ✅ Detect geo-mismatch fraud

### Integration Tests

Test file: `tests/integration/fraud-check.test.ts`

Validates:
- Risk scoring algorithm correctness
- Decision thresholds enforcement
- Signal detection accuracy
- Velocity anomaly detection
- Pipeline event creation
- Registry configuration

## API Endpoints

### POST /api/antifraud/assess

Headless fraud assessment endpoint.

**Request:**
```json
{
  "session_id": "session123",
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "device_hash": "abc123def456",
  "billing_country": "US",
  "ip_country": "US",
  "events": []
}
```

**Response:**
```json
{
  "session_id": "session123",
  "total_score": 25,
  "decision": "allow",
  "signals": [...],
  "assessed_at": "2026-02-08T12:34:56.789Z"
}
```

## Configuration

### VelocityStore

The system uses a **shared VelocityStore singleton** so repeated attempts accumulate over time.

- **Local/dev**: In-memory singleton persists for the backend runtime
- **Production**: Uses the persistent KV-backed store when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set

Notes:
- In-memory resets on server restart or cold start
- KV storage persists across restarts for long-lived velocity tracking

### Risk Thresholds

Customize thresholds via `AssessmentConfig`:

```typescript
const assessment = await assessRisk({
  input: { /* ... */ },
  config: {
    velocityStore: new InMemoryVelocityStorage(),
    allowThreshold: 25,    // ← Lower = stricter
    blockThreshold: 75,    // ← Higher = more lenient
  },
});
```

## Migration Path

### For Existing Checkouts

If using standard pipeline definitions without antifraud:
1. Continue using `PIPELINE_CHECKOUT_DIGITAL`, etc.
2. No fraud check step enforced
3. Optional: Call `/api/antifraud/assess` separately for monitoring

### To Enable Antifraud

Update client-side checkout component:
```typescript
// Before
pipelineType: "checkout_digital"

// After: enable antifraud
pipelineType: "checkout_digital_antifraud"
```

Pipeline will automatically insert fraud_check step.

## Error Handling

### Blocked Checkout

User sees:
```
❌ Fraud check failed: BLOCK
Signals: velocity_check (85), geo_mismatch (92)
Please contact support if you believe this is an error.
```

### Review Decision

Logged but checkout continues:
```
⚠️ Fraud check: REVIEW (score: 52)
This transaction flagged for manual review.
```

### Assessment Error

If antifraud service unavailable, checkout can:
- Fail closed (default): Block all transactions
- Fail open: Allow all transactions (not recommended for production)

Configure via environment:
```bash
ANTIFRAUD_FAIL_MODE=closed  # or "open"
```

## Observability

### Tracing

Fraud check emits traces with:
- `fraud_check.decision` - allow/review/block
- `fraud_check.score` - numeric risk score
- `fraud_check.signals` - array of detected signals
- `antifraud.request_duration_ms` - latency

### Monitoring

Key metrics:
- % transactions blocked/reviewed
- Average risk score by country/device
- Fraud signal frequency
- Assessment API latency
- False positive rate (from manual review outcomes)

### Logging

All fraud assessments logged:
```
[FRAUD-CHECK] session=abc123 decision=block score=85 signals=5
[FRAUD-REVIEW] session=def456 decision=review score=52 requires_escalation=true
```

## Next Steps

- [ ] Manual review workflow for flagged transactions
- [ ] Machine learning model training on historical data
- [ ] Custom rule engine for business-specific signals
- [ ] Integration with external fraud services (3D Secure, etc.)
- [ ] Dashboard analytics on fraud patterns by region/product
