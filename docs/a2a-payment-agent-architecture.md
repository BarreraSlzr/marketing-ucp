# A2A Payment Agent Architecture

## Overview

Integrating the Agent2Agent (A2A) Protocol into the payment handler ecosystem enables:

1. **Standardized Agentic Payment Requests** — Agents can request payments using A2A protocol
2. **Real-time Payment Streaming** — SSE-based task updates for payment status
3. **Complex Payment Workflows** — Multi-step payment operations with state transitions
4. **Human-in-the-loop** — AI agents + human approval workflows
5. **Interoperability** — Any A2A-compliant client can orchestrate payments

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           A2A Payment Agent Server (@repo/a2a-payment)      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────────┐      │
│  │  A2A Skill Defs  │─────────│  AgentExecutor       │      │
│  │                  │         │  (Payment Tasks)     │      │
│  │ • request-payment│         │                      │      │
│  │ • check-status   │         │ • Validate order     │      │
│  │ • cancel-payment │         │ • Route to handler   │      │
│  │ • refund         │         │ • Stream updates     │      │
│  └──────────────────┘         └──────────────────────┘      │
│                                           │                  │
│                                           ▼                  │
│                                  ┌──────────────────┐        │
│        ┌─────────────────────────│ Payment Handler  │        │
│        │                         │ Registry         │        │
│        │                         │                  │        │
│        │                         │ • PayPal MX      │        │
│        │                         │ • MercadoPago    │        │
│        │                         │ • Compropago     │        │
│        │                         │ • STP SPEI       │        │
│        │                         │ • Stripe         │        │
│        │                         │ • Polar          │        │
│        │                         │ • Thirdweb       │        │
│        │                         └──────────────────┘        │
│        │                                                      │
│        ▼                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐   │
│  │ Task Store     │  │ Event Bus       │  │ Push Notif  │   │
│  │ (Status)       │  │ (Status updates)│  │ (Webhooks)  │   │
│  └────────────────┘  └────────────────┘  └─────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘

└─ Supports: JSON-RPC, gRPC, HTTP+JSON
└─ Transports: SSE (streaming), REST, gRPC
└─ Output: TaskStatusUpdateEvent, Artifacts (receipts/reports)
```

## Core Components

### 1. A2A Payment Agent Server (`@repo/a2a-payment`)

```typescript
// server.ts
import { AgentExecutor, RequestContext, ExecutionEventBus } from '@a2a-js/sdk/server';
import { createJsonRpcHandler, createRestHandler } from '@a2a-js/sdk/server/express';
import { registerPaymentHandlers } from '@/lib/payment-handlers';

class PaymentAgentExecutor implements AgentExecutor {
  async execute(ctx: RequestContext, bus: ExecutionEventBus): Promise<void> {
    const { skill, params, taskId, contextId } = ctx;
    
    // Emit working state
    bus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: { state: 'working', timestamp: now() },
      final: false,
    });

    try {
      switch (skill?.id) {
        case 'request-payment':
          await this.executePaymentRequest(params, taskId, contextId, bus);
          break;
        case 'check-status':
          await this.checkPaymentStatus(params, taskId, contextId, bus);
          break;
        case 'refund':
          await this.executeRefund(params, taskId, contextId, bus);
          break;
        // ... more skills
      }
    } catch (error) {
      bus.publish({
        kind: 'status-update',
        taskId,
        contextId,
        status: { state: 'failed', timestamp: now() },
        final: true,
      });
      bus.finished();
    }
  }

  private async executePaymentRequest(
    params: unknown,
    taskId: string,
    contextId: string,
    bus: ExecutionEventBus
  ): Promise<void> {
    // 1. Validate payment request
    const request = PaymentRequestSchema.parse(params);
    
    // 2. Get appropriate handler
    const handler = getPaymentHandler(request.provider);
    
    // 3. Create session
    const session = await handler.createPaymentSession(request.order);
    
    // 4. Emit artifact (checkout link/session)
    bus.publish({
      kind: 'artifact-update',
      taskId,
      contextId,
      artifact: {
        artifactId: 'checkout-session',
        name: 'session.json',
        parts: [{ kind: 'text', text: JSON.stringify(session) }],
      },
    });
    
    // 5. Complete task
    bus.publish({
      kind: 'status-update',
      taskId,
      contextId,
      status: { state: 'completed', timestamp: now() },
      final: true,
    });
    bus.finished();
  }

  async cancelTask(taskId: string): Promise<void> {
    // Cancel ongoing payment task
  }
}

// Server setup
const executor = new PaymentAgentExecutor();
registerPaymentHandlers(); // Bootstrap existing handlers

const agentCard: AgentCard = {
  name: 'UCP Payment Agent',
  description: 'Process payments across multiple Mexican IFPE providers',
  protocolVersion: '0.3.0',
  version: '1.0.0',
  url: 'https://api.example.com/.well-known/agent-card.json',
  skills: [
    {
      id: 'request-payment',
      name: 'Request Payment',
      description: 'Initiate a payment with order details',
      tags: ['payment', 'checkout'],
    },
    {
      id: 'check-status',
      name: 'Check Payment Status',
      description: 'Get real-time payment status',
      tags: ['payment', 'status'],
    },
    {
      id: 'refund',
      name: 'Process Refund',
      description: 'Issue a refund for a payment',
      tags: ['payment', 'refund'],
    },
    {
      id: 'cancel-payment',
      name: 'Cancel Payment',
      description: 'Cancel a pending payment',
      tags: ['payment', 'cancellation'],
    },
  ],
  capabilities: {
    streaming: true,
    pushNotifications: true,
  },
  additionalInterfaces: [
    { url: 'https://api.example.com/a2a/jsonrpc', transport: 'JSONRPC' },
    { url: 'https://api.example.com/a2a/rest', transport: 'HTTP+JSON' },
    { url: 'api.example.com:4001', transport: 'GRPC' },
  ],
};

const requestHandler = new DefaultRequestHandler(
  agentCard,
  new InMemoryTaskStore(),
  executor
);

// Express setup
app.use('/.well-known/agent-card.json', agentCardHandler({ agentCardProvider: requestHandler }));
app.use('/a2a/jsonrpc', jsonRpcHandler({ requestHandler }));
app.use('/a2a/rest', restHandler({ requestHandler }));
```

### 2. A2A Client Integration (for orchestrating payments from LLMs/agents)

```typescript
// Usage from an AI agent or orchestration layer
import { ClientFactory } from '@a2a-js/sdk/client';

const factory = new ClientFactory();
const paymentAgent = await factory.createFromUrl('https://api.example.com');

// Stream a payment request
async function requestPaymentViaA2A(order: Order, provider: string) {
  const stream = paymentAgent.sendMessageStream({
    message: {
      messageId: uuidv4(),
      role: 'user',
      kind: 'message',
      parts: [
        {
          kind: 'text',
          text: `Process payment for order ${order.id} using ${provider}`,
        },
      ],
    },
    configuration: {
      acceptedOutputModes: ['application/json'],
      pushNotificationConfig: {
        url: 'https://my-app.com/webhooks/payment-updates',
        token: 'secret-token',
      },
    },
  });

  // Stream real-time updates
  for await (const event of stream) {
    if (event.kind === 'task') {
      console.log(`Payment task created: ${event.id}`);
    } else if (event.kind === 'artifact-update' && event.artifact.artifactId === 'checkout-session') {
      console.log('Checkout session:', event.artifact.parts[0].text);
    } else if (event.kind === 'status-update') {
      console.log(`Payment status: ${event.status.state}`);
      if (event.final && event.status.state === 'completed') {
        console.log('✓ Payment completed');
      }
    }
  }
}
```

### 3. Schema: A2A Payment Request/Response

```typescript
// @repo/a2a-payment/schemas.ts
export const PaymentRequestSchema = z.object({
  provider: z.enum(['paypal-mx', 'mercadopago', 'compropago', 'stp', 'stripe', 'polar']),
  order: OrderSchema,
  metadata: z.record(z.any()).optional(),
  pushNotificationUrl: z.string().url().optional(),
});

export const PaymentResponseSchema = z.object({
  sessionId: z.string(),
  checkoutUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const PaymentStatusResponseSchema = z.object({
  orderId: z.string(),
  status: OrderStatusSchema,
  provider: z.string(),
  transactionId: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  lastUpdated: z.string().datetime(),
});
```

## Integration Points

### 1. **Existing Payment Handlers** ↔ **A2A Agent**
- No breaking changes to existing handler interface
- A2A agent is a facade/orchestration layer above handlers
- Handlers remain focused on provider-specific logic

### 2. **Task Status Workflow**
```
pending → submitted (A2A task created)
      ↓
    working (handler validating, creating session)
      ↓
 artifacts published (checkout link/session ID)
      ↓
    completed (payment session created, awaiting callback)
      ↓
(webhook received via payment handler)
 → order.status: confirmed/refunded/failed
```

### 3. **Webhook Coordination**
```
Provider Webhook → Payment Handler Router
                ↓
    PaymentHandler.processWebhookEvent()
                ↓
        Update Order Status
                ↓
  A2A Task Push Notification (if configured)
                ↓
    Client/Agent Alerted
```

## Implementation Phases

### Phase 1: Core A2A Payment Agent
- [ ] Create `@repo/a2a-payment` package
- [ ] Implement `PaymentAgentExecutor` with 4 core skills
- [ ] Add payment request/response schemas
- [ ] Set up Express/JSON-RPC/gRPC servers
- [ ] Document agent card

### Phase 2: Advanced Workflows
- [ ] Human-in-the-loop approval (custom skill)
- [ ] Multi-provider fallback orchestration
- [ ] Payment reconciliation tasks
- [ ] Refund automation workflows

### Phase 3: LLM Integration
- [ ] Tool definitions for Claude/GPT payment agents
- [ ] Payment orchestration agent samples
- [ ] Webhook processing agent
- [ ] Real-time status monitoring agent

## Benefits

| Aspect | Traditional Payment Handlers | A2A Agent |
|--------|------------------------------|-----------|
| **Invocation** | Imperative function calls | Declarative agent requests |
| **Status Updates** | Polling/callbacks | Real-time streaming (SSE) |
| **Long-running Ops** | Fire-and-forget + webhook | Task-based with status history |
| **Multi-provider** | Manual routing logic | Agent decides/falls back |
| **AI Integration** | Tool functions | Native A2A protocol |
| **Interoperability** | Custom integration code | Standardized protocol |
| **Human Approval** | Custom middleware | Native task suspension/continuation |

## Configuration

```typescript
// A2A Payment Agent in .env
A2A_PAYMENT_AGENT_URL=https://api.example.com
A2A_AGENT_CARD_PATH=/.well-known/agent-card.json
A2A_JSONRPC_PATH=/a2a/jsonrpc
A2A_REST_PATH=/a2a/rest
A2A_GRPC_HOST=localhost:4001

// Notification settings
A2A_WEBHOOK_TIMEOUT_MS=5000
A2A_TASK_TTL_SECONDS=86400

// Provider-specific (reuse existing)
PAYPAL_MX_CLIENT_ID=...
PAYPAL_MX_CLIENT_SECRET=...
MERCADOPAGO_ACCESS_TOKEN=...
// ... etc
```

## Next Steps

1. **Review A2A protocol spec** — Validate alignment with requirements
2. **Prototype core agent** — Proof-of-concept with 1 payment handler
3. **Define agent card** — Specify skills and capabilities
4. **Integration tests** — Verify streaming and task lifecycle
5. **Documentation** — Agent usage patterns for external clients

---

**References:**
- [A2A Protocol Specification](https://a2a-protocol.org/)
- [a2a-js SDK](https://github.com/a2aproject/a2a-js)
- [Existing Payment Handlers](./payment-handlers.md)
