# Pipeline Tracking Flow - Visual Guide

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        CHECKOUT FLOW WITH TRACKING                        │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   Client    │        │  Next.js    │        │  Pipeline   │
│  Browser    │        │   Server    │        │   Tracker   │
└──────┬──────┘        └──────┬──────┘        └──────┬──────┘
       │                      │                       │
       │  1. Start Checkout   │                       │
       │─────────────────────>│                       │
       │                      │                       │
       │                      │  2. Create Session    │
       │                      │      chk_abc123       │
       │                      │                       │
       │  3. Buyer Validates  │                       │
       │─────────────────────>│                       │
       │                      │                       │
       │                      │  4. Track Event       │
       │                      │─────────────────────>│
       │                      │                       │
       │                      │                   ┌───┴───┐
       │                      │                   │ Store │
       │                      │                   │ Event │
       │                      │                   └───┬───┘
       │                      │                       │
       │                      │                   ┌───┴────┐
       │                      │                   │Compute │
       │                      │                   │Checksum│
       │                      │                   └───┬────┘
       │                      │                       │
       │                      │                   ┌───┴────┐
       │                      │                   │Snapshot│
       │                      │                   │Registry│
       │                      │                   └───┬────┘
       │                      │                       │
       │                      │  5. Event Stored      │
       │                      │<──────────────────────│
       │  6. Success Response │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │  [useSWR Polling]    │                       │
       │                      │                       │
       │  7. GET Status       │                       │
       │─────────────────────>│                       │
       │                      │                       │
       │                      │  8. Get Status        │
       │                      │─────────────────────>│
       │                      │                       │
       │                      │                   ┌───┴────┐
       │                      │                   │ Query  │
       │                      │                   │ Events │
       │                      │                   └───┬────┘
       │                      │                       │
       │                      │                   ┌───┴────┐
       │                      │                   │Compute │
       │                      │                   │Current │
       │                      │                   │Checksum│
       │                      │                   └───┬────┘
       │                      │                       │
       │                      │                   ┌───┴────┐
       │                      │                   │  Get   │
       │                      │                   │History │
       │                      │                   └───┬────┘
       │                      │                       │
       │                      │  9. Status Summary    │
       │                      │<──────────────────────│
       │  10. Display Status  │                       │
       │<─────────────────────│                       │
       │                      │                       │
       │  [2 seconds later]   │                       │
       │                      │                       │
       │  11. GET Status      │                       │
       │─────────────────────>│                       │
       │       (repeat)       │                       │
       │                      │                       │
```

## Data Structures

### PipelineEvent
```
┌────────────────────────────────────────────────────────┐
│ id: "chk_abc123.checkout_digital.buyer_validated.0"   │
│ session_id: "chk_abc123"                               │
│ pipeline_type: "checkout_digital"                      │
│ step: "buyer_validated"                                │
│ sequence: 0                                            │
│ status: "success"                                      │
│ input_checksum: "a1b2c3..." (SHA-256)                  │
│ output_checksum: "d4e5f6..." (SHA-256)                 │
│ timestamp: "2026-02-07T02:15:00.000Z"                  │
└────────────────────────────────────────────────────────┘
```

### ChecksumRegistryEntry
```
┌────────────────────────────────────────────────────────┐
│ id: "reg_chk_abc123_1738894500000"                     │
│ session_id: "chk_abc123"                               │
│ pipeline_type: "checkout_digital"                      │
│ chain_hash: "789abc..." (SHA-256 chain)                │
│ steps_expected: 4                                      │
│ steps_completed: 1                                     │
│ steps_failed: 0                                        │
│ is_valid: false                                        │
│ created_at: "2026-02-07T02:15:00.100Z"                 │
│ notes: "Auto-snapshot after event: buyer_validated"   │
│ event_ids: ["chk_abc123.checkout_digital.buyer..."]   │
└────────────────────────────────────────────────────────┘
```

## Chain Hash Evolution

```
Step 1: buyer_validated
┌─────────┐
│ GENESIS │──> SHA256("GENESIS:input_hash_1:output_hash_1")
└─────────┘                                │
                                           ▼
                                    hash_1 = "abc123..."

Step 2: payment_initiated
┌─────────┐
│ hash_1  │──> SHA256("abc123...:input_hash_2:output_hash_2")
└─────────┘                                │
                                           ▼
                                    hash_2 = "def456..."

Step 3: payment_confirmed
┌─────────┐
│ hash_2  │──> SHA256("def456...:input_hash_3:output_hash_3")
└─────────┘                                │
                                           ▼
                                    hash_3 = "789abc..."

Final: chain_hash
┌─────────┐
│ hash_3  │──> SHA256("chk_abc123:789abc...")
└─────────┘                                │
                                           ▼
                                    chain_hash = "012def..."
                                    (Scoped to session)
```

## useSWR Integration Pattern

```typescript
// Client Component
function CheckoutProgress() {
  const { data } = useSWR(
    '/api/pipeline/status?session_id=chk_abc123&pipeline_type=checkout_digital',
    fetcher,
    { refreshInterval: 2000 }  // Poll every 2 seconds
  );

  // data structure:
  {
    session_id: "chk_abc123",
    pipeline_type: "checkout_digital",
    events: [...],              // All pipeline events
    current_checksum: {         // Real-time checksum
      chain_hash: "...",
      steps_completed: 2,
      steps_expected: 4,
      is_valid: false
    },
    latest_snapshot: {...},     // Most recent registry entry
    registry_history: [...]     // All snapshots
  }
}
```

## State Progression Example

```
Time: T0 - Initial State
┌────────────────────────────────────┐
│ Events: []                         │
│ Snapshots: []                      │
│ Progress: 0/4                      │
│ Valid: false                       │
└────────────────────────────────────┘

Time: T1 - Buyer Validated
┌────────────────────────────────────┐
│ Events: [buyer_validated]          │
│ Snapshots: [snapshot_1]            │
│ Progress: 1/4                      │
│ Valid: false                       │
│ Chain: hash_1                      │
└────────────────────────────────────┘

Time: T2 - Payment Initiated
┌────────────────────────────────────┐
│ Events: [buyer_validated,          │
│          payment_initiated]        │
│ Snapshots: [snapshot_1,            │
│             snapshot_2]            │
│ Progress: 2/4                      │
│ Valid: false                       │
│ Chain: hash_2 (chained from hash_1)│
└────────────────────────────────────┘

Time: T3 - Payment Confirmed
┌────────────────────────────────────┐
│ Events: [buyer_validated,          │
│          payment_initiated,        │
│          payment_confirmed]        │
│ Snapshots: [snapshot_1,            │
│             snapshot_2,            │
│             snapshot_3]            │
│ Progress: 3/4                      │
│ Valid: false                       │
│ Chain: hash_3 (chained from hash_2)│
└────────────────────────────────────┘

Time: T4 - Checkout Completed
┌────────────────────────────────────┐
│ Events: [buyer_validated,          │
│          payment_initiated,        │
│          payment_confirmed,        │
│          checkout_completed]       │
│ Snapshots: [snapshot_1,            │
│             snapshot_2,            │
│             snapshot_3,            │
│             snapshot_4]            │
│ Progress: 4/4 ✓                    │
│ Valid: true ✓                      │
│ Chain: hash_4 (final chain)       │
└────────────────────────────────────┘
```

## Issue Report Generation

```
When pipeline fails at T2 (payment failure):

generateIssueReport() →
┌────────────────────────────────────────────────────┐
│ session_id: "chk_abc123"                           │
│ pipeline_type: "checkout_digital"                  │
│ is_valid: false                                    │
│                                                    │
│ failed_steps: ["payment_initiated"]               │
│                                                    │
│ missing_steps: ["payment_confirmed",              │
│                  "checkout_completed"]            │
│                                                    │
│ events: [                                         │
│   {step: "buyer_validated", status: "success"},  │
│   {step: "payment_initiated", status: "failure", │
│    error: "Card declined"}                       │
│ ]                                                 │
│                                                    │
│ checksum_history: [snapshot_1, snapshot_2]        │
│                                                    │
│ report_generated_at: "2026-02-07T02:15:30.000Z"   │
└────────────────────────────────────────────────────┘
```

## Storage Abstraction

```
┌─────────────────────────────────────────────────────┐
│              PipelineTracker                        │
│  ┌───────────────────────────────────────────────┐ │
│  │ Configuration:                                │ │
│  │  - eventStorage: PipelineStorage              │ │
│  │  - registryStorage: ChecksumRegistryStorage   │ │
│  │  - autoSnapshot: boolean                      │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                    │                 │
                    ▼                 ▼
        ┌────────────────┐  ┌──────────────────┐
        │ Event Storage  │  │ Registry Storage │
        └────────────────┘  └──────────────────┘
                │                     │
     ┌──────────┴──────────┐         │
     ▼                     ▼         ▼
┌──────────┐    ┌──────────────┐  ┌──────────────┐
│In-Memory │    │ KV Store     │  │ Database     │
│(dev/test)│    │(Cloudflare)  │  │(PostgreSQL)  │
└──────────┘    └──────────────┘  └──────────────┘
```

## API Endpoints

### GET /api/pipeline/status
```
Request:
  ?session_id=chk_abc123
  &pipeline_type=checkout_digital

Response:
  {
    session_id: "chk_abc123",
    pipeline_type: "checkout_digital",
    events: PipelineEvent[],
    current_checksum: PipelineChecksum,
    latest_snapshot: ChecksumRegistryEntry | null,
    registry_history: ChecksumRegistryEntry[]
  }
```

### POST /api/pipeline/track
```
Request Body:
  {
    event: PipelineEvent,
    auto_snapshot?: boolean
  }

Response:
  {
    success: true,
    event: PipelineEvent,
    snapshot?: ChecksumRegistryEntry
  }
```

## Use Case Timeline

```
E-commerce Checkout Journey:

  [Customer]             [System]              [Pipeline Tracker]
      │                     │                         │
      │ Add to cart         │                         │
      ├────────────────────>│                         │
      │                     │                         │
      │                     │ Create session          │
      │                     │ chk_abc123              │
      │                     │                         │
      │ Enter details       │                         │
      ├────────────────────>│                         │
      │                     │                         │
      │                     │ Track: buyer_validated  │
      │                     ├────────────────────────>│
      │                     │                         │
      │                     │                    [Snapshot 1]
      │                     │                         │
      │ Submit payment      │                         │
      ├────────────────────>│                         │
      │                     │                         │
      │                     │ Track: payment_initiated│
      │                     ├────────────────────────>│
      │                     │                         │
      │                     │                    [Snapshot 2]
      │                     │                         │
      │ [Processing...]     │                         │
      │                     │                         │
      │ [Poll status]       │                         │
      ├────────────────────>│                         │
      │                     │                         │
      │                     │ Get status summary      │
      │                     ├────────────────────────>│
      │                     │<────────────────────────┤
      │ Show progress 2/4   │                         │
      │<────────────────────┤                         │
      │                     │                         │
      │ [Wait 2s...]        │                         │
      │                     │                         │
      │ [Poll status]       │                         │
      ├────────────────────>│                         │
      │                     │                         │
      │                     │ Get status summary      │
      │                     ├────────────────────────>│
      │                     │<────────────────────────┤
      │                     │                         │
      │                     │ Track: payment_confirmed│
      │                     ├────────────────────────>│
      │                     │                         │
      │                     │                    [Snapshot 3]
      │ Payment success!    │                         │
      │<────────────────────┤                         │
      │                     │                         │
```

This visual guide illustrates the complete flow from checkout initiation to completion, showing how events are tracked, checksums are computed, and registry entries are created in real-time.
