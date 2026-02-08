// LEGEND: Demo pipeline generator for observability dashboards
// Shared helper for seeding demo sessions with events
// All usage must comply with this LEGEND and the LICENSE

import { getGlobalTracker, registerSessionId } from "@/lib/pipeline-tracker";
import { getIsoTimestamp, getIsoTimestampFromUnix } from "@/utils/stamp";
import {
  createPipelineEvent,
  PIPELINE_CHECKOUT_DIGITAL,
  PIPELINE_CHECKOUT_DIGITAL_ANTIFRAUD,
  PIPELINE_CHECKOUT_PHYSICAL,
  PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD,
  PIPELINE_CHECKOUT_SUBSCRIPTION,
  type PipelineEventStatus,
  type PipelineStep,
  type PipelineType,
} from "@repo/pipeline";

interface DemoStep {
  step: PipelineStep;
  status: PipelineEventStatus;
  handler: string;
  duration_ms?: number;
  sequence?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface DemoSession {
  session_id: string;
  pipeline_type: PipelineType;
  hour_offset: number;
  steps: DemoStep[];
  product: DemoProduct;
}

interface DemoProduct {
  product_id: string;
  product_name: string;
  sku: string;
  price: number;
  currency: string;
  quantity: number;
  weight: number;
  weight_unit: string;
  dimensions: string;
}

const handlerProfiles = {
  zod: { base: 80, jitter: 40 },
  stripe: { base: 420, jitter: 180 },
  polar: { base: 520, jitter: 220 },
  shopify: { base: 480, jitter: 200 },
  antifraud: { base: 180, jitter: 70 },
  "manual-review": { base: 900, jitter: 250 },
} as const;

function resolveDuration(params: { handler: keyof typeof handlerProfiles; index: number }): number {
  const profile = handlerProfiles[params.handler] ?? handlerProfiles.zod;
  const swing = (params.index % 3) - 1;
  const jitter = profile.jitter * swing;
  return Math.max(40, profile.base + jitter);
}

function buildFraudMetadata(params: {
  decision: "allow" | "review" | "block";
  score: number;
  signals: Array<{ signal: string; score: number }>;
}): Record<string, unknown> {
  return {
    decision: params.decision,
    score: params.score,
    signals_count: params.signals.length,
    signals: params.signals,
    assessed_at: getIsoTimestamp(),
  };
}

const demoSessions: DemoSession[] = [
  {
    session_id: "demo_physical_001",
    pipeline_type: "checkout_physical",
    hour_offset: 2,
    product: {
      product_id: "ucp-hoodie-stone",
      product_name: "Stonewash Hoodie",
      sku: "HOODIE-STONE-M",
      price: 68,
      currency: "USD",
      quantity: 1,
      weight: 0.6,
      weight_unit: "kg",
      dimensions: "34 x 26 x 6 cm",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      { step: "address_validated", status: "success", handler: "zod" },
      { step: "payment_initiated", status: "success", handler: "stripe" },
      { step: "payment_confirmed", status: "success", handler: "stripe" },
      { step: "fulfillment_delegated", status: "success", handler: "shopify" },
      { step: "checkout_completed", status: "success", handler: "stripe" },
    ],
  },
  {
    session_id: "demo_digital_001",
    pipeline_type: "checkout_digital",
    hour_offset: 5,
    product: {
      product_id: "ucp-gift-card",
      product_name: "UCP Gift Card",
      sku: "GIFT-50",
      price: 50,
      currency: "USD",
      quantity: 1,
      weight: 0,
      weight_unit: "kg",
      dimensions: "Digital",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      { step: "payment_initiated", status: "success", handler: "polar" },
      { step: "payment_confirmed", status: "success", handler: "polar" },
      { step: "checkout_completed", status: "success", handler: "polar" },
    ],
  },
  {
    session_id: "demo_failed_001",
    pipeline_type: "checkout_physical",
    hour_offset: 8,
    product: {
      product_id: "ucp-weekender",
      product_name: "UCP Weekender Bag",
      sku: "BAG-WEEKENDER",
      price: 124,
      currency: "USD",
      quantity: 1,
      weight: 1.2,
      weight_unit: "kg",
      dimensions: "52 x 28 x 22 cm",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      { step: "address_validated", status: "success", handler: "zod" },
      { step: "payment_initiated", status: "success", handler: "stripe" },
      {
        step: "payment_confirmed",
        status: "failure",
        handler: "stripe",
        error: "Payment declined",
        metadata: { error_code: "card_declined" },
      },
      {
        step: "payment_confirmed",
        status: "success",
        handler: "stripe",
        sequence: 1,
      },
      { step: "fulfillment_delegated", status: "success", handler: "shopify" },
      { step: "checkout_completed", status: "success", handler: "stripe" },
    ],
  },
  {
    session_id: "demo_review_001",
    pipeline_type: "checkout_digital_antifraud",
    hour_offset: 13,
    product: {
      product_id: "ucp-team-seat",
      product_name: "UCP Team Seat",
      sku: "SEAT-TEAM-ANNUAL",
      price: 240,
      currency: "USD",
      quantity: 5,
      weight: 0,
      weight_unit: "kg",
      dimensions: "Digital",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      {
        step: "fraud_check",
        status: "success",
        handler: "antifraud",
        metadata: buildFraudMetadata({
          decision: "review",
          score: 58,
          signals: [
            { signal: "velocity_email", score: 42 },
            { signal: "geo_mismatch", score: 35 },
          ],
        }),
      },
      {
        step: "fraud_review_escalated",
        status: "pending",
        handler: "manual-review",
      },
      { step: "payment_initiated", status: "pending", handler: "polar" },
    ],
  },
  {
    session_id: "demo_blocked_001",
    pipeline_type: "checkout_physical_antifraud",
    hour_offset: 18,
    product: {
      product_id: "ucp-sneaker",
      product_name: "UCP Limited Sneakers",
      sku: "SNEAKER-LTD-9",
      price: 180,
      currency: "USD",
      quantity: 1,
      weight: 0.9,
      weight_unit: "kg",
      dimensions: "30 x 20 x 12 cm",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      { step: "address_validated", status: "success", handler: "zod" },
      {
        step: "fraud_check",
        status: "failure",
        handler: "antifraud",
        error: "Risk score exceeded block threshold",
        metadata: buildFraudMetadata({
          decision: "block",
          score: 92,
          signals: [
            { signal: "device_anomaly", score: 65 },
            { signal: "velocity_device", score: 78 },
          ],
        }),
      },
      {
        step: "checkout_failed",
        status: "failure",
        handler: "antifraud",
        error: "Checkout blocked by antifraud",
      },
    ],
  },
  {
    session_id: "demo_subscription_001",
    pipeline_type: "checkout_subscription",
    hour_offset: 21,
    product: {
      product_id: "ucp-subscription",
      product_name: "UCP Pro Subscription",
      sku: "SUB-PRO-MO",
      price: 29,
      currency: "USD",
      quantity: 1,
      weight: 0,
      weight_unit: "kg",
      dimensions: "Digital",
    },
    steps: [
      { step: "buyer_validated", status: "success", handler: "zod" },
      { step: "payment_initiated", status: "success", handler: "polar" },
      { step: "payment_confirmed", status: "success", handler: "polar" },
      { step: "webhook_received", status: "success", handler: "polar" },
      { step: "webhook_verified", status: "success", handler: "polar" },
      { step: "checkout_completed", status: "success", handler: "polar" },
    ],
  },
];

export async function generateDemoPipelineEvents(): Promise<{
  sessions: Array<{ session_id: string; pipeline_type: PipelineType; event_count: number }>;
}> {
  const tracker = getGlobalTracker();
  const nowIso = getIsoTimestamp();
  const nowMs = Date.parse(nowIso);
  const hourMs = 60 * 60 * 1_000;

  const totalSessions = demoSessions.length;
  let sessionIndex = 0;

  for (const session of demoSessions) {
    sessionIndex += 1;
    console.log(`[demo] Seeding session ${sessionIndex}/${totalSessions}`);
    registerSessionId(session.session_id);

    const sessionStartMs = nowMs - session.hour_offset * hourMs;
    let cursorMs = sessionStartMs;

    const totalSteps = session.steps.length;
    let stepIndex = 0;

    for (const stepData of session.steps) {
      stepIndex += 1;
      console.log(
        `[demo]  Step ${stepIndex}/${totalSteps} for ${session.session_id}`
      );
      const durationMs =
        stepData.duration_ms ??
        resolveDuration({
          handler: stepData.handler as keyof typeof handlerProfiles,
          index: stepIndex,
        });

      const timestampIso = getIsoTimestampFromUnix({
        seconds: Math.floor(cursorMs / 1000),
      });

      const event = {
        ...createPipelineEvent({
          session_id: session.session_id,
          pipeline_type: session.pipeline_type,
          step: stepData.step,
          status: stepData.status,
          duration_ms: durationMs,
          sequence: stepData.sequence ?? 0,
          error: stepData.error,
          handler: stepData.handler,
          input_checksum: "a".repeat(64),
          output_checksum: "b".repeat(64),
          metadata: {
            demo: true,
            generated_at: nowIso,
            product_id: session.product.product_id,
            product_name: session.product.product_name,
            sku: session.product.sku,
            price: session.product.price,
            currency: session.product.currency,
            quantity: session.product.quantity,
            weight: session.product.weight,
            weight_unit: session.product.weight_unit,
            dimensions: session.product.dimensions,
            ...stepData.metadata,
          },
        }),
        timestamp: timestampIso,
      };

      const definition =
        session.pipeline_type === "checkout_physical"
          ? PIPELINE_CHECKOUT_PHYSICAL
          : session.pipeline_type === "checkout_digital"
            ? PIPELINE_CHECKOUT_DIGITAL
            : session.pipeline_type === "checkout_physical_antifraud"
              ? PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD
              : session.pipeline_type === "checkout_digital_antifraud"
                ? PIPELINE_CHECKOUT_DIGITAL_ANTIFRAUD
                : PIPELINE_CHECKOUT_SUBSCRIPTION;

      await tracker.trackEvent({ event, definition });
      cursorMs += durationMs + 250;
    }
  }

  const healthEvents: Array<{
    handler: keyof typeof handlerProfiles;
    session_id: string;
    pipeline_type: PipelineType;
    step: PipelineStep;
    status: PipelineEventStatus;
  }> = [
    {
      handler: "zod",
      session_id: "demo_health_zod",
      pipeline_type: "checkout_digital",
      step: "buyer_validated",
      status: "success",
    },
    {
      handler: "stripe",
      session_id: "demo_health_stripe",
      pipeline_type: "checkout_digital",
      step: "payment_initiated",
      status: "success",
    },
    {
      handler: "polar",
      session_id: "demo_health_polar",
      pipeline_type: "checkout_subscription",
      step: "payment_confirmed",
      status: "success",
    },
    {
      handler: "shopify",
      session_id: "demo_health_shopify",
      pipeline_type: "checkout_physical",
      step: "fulfillment_delegated",
      status: "success",
    },
    {
      handler: "antifraud",
      session_id: "demo_health_antifraud",
      pipeline_type: "checkout_digital_antifraud",
      step: "fraud_check",
      status: "success",
    },
    {
      handler: "manual-review",
      session_id: "demo_health_manual_review",
      pipeline_type: "checkout_digital_antifraud",
      step: "fraud_review_escalated",
      status: "pending",
    },
  ];

  const totalHealth = healthEvents.length;
  let healthIndex = 0;
  for (const healthEvent of healthEvents) {
    healthIndex += 1;
    console.log(`[demo] Seeding health ${healthIndex}/${totalHealth}`);
    registerSessionId(healthEvent.session_id);

    const durationMs = resolveDuration({
      handler: healthEvent.handler,
      index: healthIndex,
    });
    const event = {
      ...createPipelineEvent({
        session_id: healthEvent.session_id,
        pipeline_type: healthEvent.pipeline_type,
        step: healthEvent.step,
        status: healthEvent.status,
        duration_ms: durationMs,
        handler: healthEvent.handler,
        input_checksum: "a".repeat(64),
        output_checksum: "b".repeat(64),
        metadata: {
          demo: true,
          generated_at: nowIso,
          health_heartbeat: true,
        },
      }),
      timestamp: nowIso,
    };

    const definition =
      healthEvent.pipeline_type === "checkout_physical"
        ? PIPELINE_CHECKOUT_PHYSICAL
        : healthEvent.pipeline_type === "checkout_digital"
          ? PIPELINE_CHECKOUT_DIGITAL
          : healthEvent.pipeline_type === "checkout_physical_antifraud"
            ? PIPELINE_CHECKOUT_PHYSICAL_ANTIFRAUD
            : healthEvent.pipeline_type === "checkout_digital_antifraud"
              ? PIPELINE_CHECKOUT_DIGITAL_ANTIFRAUD
              : PIPELINE_CHECKOUT_SUBSCRIPTION;

    await tracker.trackEvent({ event, definition });
  }

  return {
    sessions: [
      ...demoSessions.map((session) => ({
        session_id: session.session_id,
        pipeline_type: session.pipeline_type,
        event_count: session.steps.length,
      })),
      ...healthEvents.map((event) => ({
        session_id: event.session_id,
        pipeline_type: event.pipeline_type,
        event_count: 1,
      })),
    ],
  };
}
