# Pipeline Tracking & Checksum Registry

## Overview

This document explains the pipeline event tracking system with checksum pattern registry, designed for real-time monitoring and issue reporting in the UCP (Unified Checkout Platform) marketing system.

## Persistent Storage (Vercel KV)

By default, pipeline events and registry entries are stored in-memory. In production, enable Vercel KV to persist event history across restarts.

### Required Environment Variables

```bash
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

When these are present, UCP automatically switches the pipeline event and checksum registry storage to Vercel KV.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│  ┌──────────────┐         ┌──────────────────────────────┐ │
│  │   useSWR     │────────>│   GET /api/pipeline/status   │ │
│  │  (Polling)   │         │   (Session ID)               │ │
│  └──────────────┘         └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     Pipeline Tracker                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Event Emission      │  Checksum Snapshots           │  │
│  │  ─────────────────   │  ──────────────────           │  │
│  │  • trackEvent()      │  • snapshotChecksum()         │  │
│  │  • getEvents()       │  • getCurrentChecksum()       │  │
│  │                      │  • getLatestSnapshot()        │  │
│  │                      │  • getRegistryHistory()       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Status Summary & Issue Reports                        │ │
│  │  ────────────────────────────────────                  │ │
│  │  • getStatusSummary()  - Complete state for useSWR    │ │
│  │  • generateIssueReport() - Debug failed pipelines     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
        ┌─────────────────┐     ┌──────────────────────┐
        │ Pipeline Events │     │  Checksum Registry   │
        │                 │     │      Entries         │
        │ • session_id    │     │  • session_id        │
        │ • composite ID  │     │  • chain_hash        │
        │ • step          │     │  • steps_completed   │
        │ • status        │     │  • created_at        │
        │ • checksums     │     │  • event_ids[]       │
        └─────────────────┘     └──────────────────────┘
```

## Data Flow

### 1. Event Emission & Auto-Snapshots

When a checkout pipeline step completes:

```typescript
import { PipelineTracker, createPipelineEvent, PIPELINE_CHECKOUT_DIGITAL } from "@repo/pipeline";

const tracker = new PipelineTracker({ autoSnapshot: true });

// Emit event and auto-snapshot
const result = await tracker.trackEvent({
  event: createPipelineEvent({
    session_id: "chk_abc123",
    pipeline_type: "checkout_digital",
    step: "payment_confirmed",
    status: "success",
    input_checksum: await computeDataChecksum({ data: paymentRequest }),
    output_checksum: await computeDataChecksum({ data: paymentResponse }),
  }),
  definition: PIPELINE_CHECKOUT_DIGITAL,
});

// result.event - The stored pipeline event
// result.snapshot - Auto-created registry entry (if autoSnapshot: true)
```

**What happens:**
1. Event is validated and stored
2. Current checksum is computed from all events
3. Registry entry is created with snapshot metadata
4. Entry includes references to all contributing event IDs

### 2. Client-Side Polling (useSWR)

Use `getStatusSummary()` for real-time status updates:

```typescript
// API Route: /api/pipeline/status?session_id=chk_abc123
import { PipelineTracker, PIPELINE_CHECKOUT_DIGITAL } from "@repo/pipeline";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  
  const tracker = new PipelineTracker();
  const summary = await tracker.getStatusSummary({
    session_id: sessionId,
    definition: PIPELINE_CHECKOUT_DIGITAL,
  });
  
  return Response.json(summary);
}
```

```typescript
// Client Component
import useSWR from "swr";

function CheckoutStatus({ sessionId }: { sessionId: string }) {
  const { data, error } = useSWR(
    `/api/pipeline/status?session_id=${sessionId}`,
    fetcher,
    { refreshInterval: 2000 } // Poll every 2 seconds
  );

  if (!data) return <div>Loading...</div>;

  return (
    <div>
      <h3>Pipeline: {data.pipeline_type}</h3>
      <p>Steps Completed: {data.current_checksum.steps_completed}/{data.current_checksum.steps_expected}</p>
      <p>Valid: {data.current_checksum.is_valid ? "✓" : "✗"}</p>
      <p>Chain Hash: {data.current_checksum.chain_hash}</p>
      
      <h4>Recent Events:</h4>
      <ul>
        {data.events.map(event => (
          <li key={event.id}>
            {event.step} - {event.status} ({event.timestamp})
          </li>
        ))}
      </ul>
      
      <h4>History Snapshots:</h4>
      <ul>
        {data.registry_history.map(snapshot => (
          <li key={snapshot.id}>
            {snapshot.created_at}: {snapshot.steps_completed} steps
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Issue Reports

Generate detailed reports for failed pipelines:

```typescript
const report = await tracker.generateIssueReport({
  session_id: "chk_failed",
  definition: PIPELINE_CHECKOUT_DIGITAL,
});

console.log({
  isValid: report.is_valid,
  failedSteps: report.failed_steps,        // ["payment_initiated"]
  missingSteps: report.missing_steps,      // ["payment_confirmed", "checkout_completed"]
  totalEvents: report.events.length,
  checksumHistory: report.checksum_history.length,
});
```

## Checksum Registry Entry Schema

Each registry entry captures a moment-in-time snapshot:

```typescript
interface ChecksumRegistryEntry {
  id: string;                    // "reg_chk_abc123_1738894800000"
  session_id: string;            // "chk_abc123"
  pipeline_type: string;         // "checkout_digital"
  chain_hash: string;            // SHA-256 hex (64 chars)
  steps_expected: number;        // 4
  steps_completed: number;       // 2
  steps_failed: number;          // 0
  is_valid: boolean;             // false (not all required steps done)
  created_at: string;            // ISO-8601 timestamp
  notes?: string;                // "Auto-snapshot after event: payment_initiated"
  event_ids?: string[];          // ["chk_abc123.checkout_digital.buyer_validated.0", ...]
}
```

## Use Cases

### 1. Real-Time Progress Tracking
Monitor checkout completion in real-time with useSWR polling.

### 2. Historical Audit Trail
View complete history of pipeline state changes via registry entries.

### 3. Debugging Failed Checkouts
Generate issue reports showing exactly which steps failed and what's missing.

### 4. Compliance & Verification
Each registry entry includes the chain hash for tamper-proof verification.

### 5. Performance Monitoring
Track how long pipelines take by comparing timestamps between registry entries.

## Storage Backends

### In-Memory (Default)
Good for development and testing:
```typescript
const tracker = new PipelineTracker(); // Uses in-memory storage
```

### Custom Backend
Implement `PipelineStorage` and `ChecksumRegistryStorage` for production:

```typescript
import type { PipelineStorage, ChecksumRegistryStorage } from "@repo/pipeline";

class KVPipelineStorage implements PipelineStorage {
  async store({ event }) {
    await kv.set(`event:${event.id}`, JSON.stringify(event));
  }
  async getBySessionId({ session_id }) {
    // Query KV store
  }
  async clear() {
    // Clear KV store
  }
}

const tracker = new PipelineTracker({
  eventStorage: new KVPipelineStorage(),
  registryStorage: new KVChecksumRegistryStorage(),
  autoSnapshot: true,
});
```

## Configuration Options

```typescript
interface PipelineTrackerConfig {
  eventStorage?: PipelineStorage;           // Custom event storage
  registryStorage?: ChecksumRegistryStorage; // Custom registry storage
  autoSnapshot?: boolean;                   // Default: true
}
```

### Auto-Snapshot Behavior

**Enabled (default):**
- Every `trackEvent()` with a `definition` creates a registry entry
- Good for real-time tracking and debugging
- More registry entries = more storage

**Disabled:**
- No automatic registry entries
- Must call `snapshotChecksum()` manually
- Less storage, more control over when to snapshot

## API Reference

### PipelineTracker Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `trackEvent()` | Emit event + optional auto-snapshot | `{ event, snapshot? }` |
| `getEvents()` | Get all events for session | `PipelineEvent[]` |
| `snapshotChecksum()` | Manually create registry entry | `ChecksumRegistryEntry` |
| `getCurrentChecksum()` | Compute checksum without storing | `PipelineChecksum` |
| `getRegistryHistory()` | Get all snapshots for session | `ChecksumRegistryEntry[]` |
| `getLatestSnapshot()` | Get most recent snapshot | `ChecksumRegistryEntry \| null` |
| `getStatusSummary()` | Complete state (for useSWR) | Status summary object |
| `generateIssueReport()` | Debug report for failures | Issue report object |

## Best Practices

1. **Use autoSnapshot for user-facing checkouts** - Enables real-time progress tracking
2. **Disable autoSnapshot for background jobs** - Reduce storage overhead
3. **Poll status at reasonable intervals** - 2-5 seconds for active checkouts
4. **Generate issue reports on failure** - Include in error logs or notifications
5. **Use custom storage in production** - In-memory is for dev/test only
6. **Include notes in manual snapshots** - Helps with debugging later

## Example: Complete Checkout Flow

```typescript
// 1. Initialize tracker
const tracker = new PipelineTracker({ autoSnapshot: true });

// 2. Buyer validates
await tracker.trackEvent({
  event: createPipelineEvent({
    session_id: "chk_001",
    pipeline_type: "checkout_digital",
    step: "buyer_validated",
    status: "success",
  }),
  definition: PIPELINE_CHECKOUT_DIGITAL,
});

// 3. Payment initiates
await tracker.trackEvent({
  event: createPipelineEvent({
    session_id: "chk_001",
    pipeline_type: "checkout_digital",
    step: "payment_initiated",
    status: "success",
  }),
  definition: PIPELINE_CHECKOUT_DIGITAL,
});

// 4. Client polls for updates
const summary = await tracker.getStatusSummary({
  session_id: "chk_001",
  definition: PIPELINE_CHECKOUT_DIGITAL,
});
// summary.current_checksum.steps_completed = 2
// summary.registry_history.length = 2

// 5. Payment fails
await tracker.trackEvent({
  event: createPipelineEvent({
    session_id: "chk_001",
    pipeline_type: "checkout_digital",
    step: "payment_confirmed",
    status: "failure",
    error: "Card declined",
  }),
  definition: PIPELINE_CHECKOUT_DIGITAL,
});

// 6. Generate issue report
const report = await tracker.generateIssueReport({
  session_id: "chk_001",
  definition: PIPELINE_CHECKOUT_DIGITAL,
});
// report.is_valid = false
// report.failed_steps = ["payment_confirmed"]
// report.missing_steps = ["checkout_completed"]
```

## Diagram: Timeline View

```
Time ─────────────────────────────────────────────────>

Event:     buyer_validated    payment_initiated    payment_confirmed    checkout_completed
           │                  │                    │                    │
Snapshot:  ●                  ●                    ●                    ●
           │                  │                    │                    │
Registry:  reg_001            reg_002              reg_003              reg_004
           steps: 1/4         steps: 2/4           steps: 3/4           steps: 4/4
           valid: ✗           valid: ✗             valid: ✗             valid: ✓
           hash:  abc123...   hash:  def456...     hash:  789abc...     hash:  012def...
```

Each snapshot preserves:
- Current chain hash (deterministic, tamper-proof)
- Progress metrics (steps completed/failed)
- Validation state (is_valid)
- References to contributing events (event_ids)

This creates a complete audit trail for debugging, compliance, and real-time monitoring.
