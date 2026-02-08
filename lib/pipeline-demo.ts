// LEGEND: Demo pipeline generator for observability dashboards
// Shared helper for seeding demo sessions with events
// All usage must comply with this LEGEND and the LICENSE

import { getGlobalTracker, registerSessionId } from "@/lib/pipeline-tracker";
import { getIsoTimestamp } from "@/utils/stamp";
import {
    createPipelineEvent,
    PIPELINE_CHECKOUT_DIGITAL,
    PIPELINE_CHECKOUT_PHYSICAL,
    type PipelineEventStatus,
    type PipelineStep,
    type PipelineType,
} from "@repo/pipeline";

interface DemoStep {
  step: PipelineStep;
  status: PipelineEventStatus;
  duration_ms: number;
  sequence?: number;
  error?: string;
}

interface DemoSession {
  session_id: string;
  pipeline_type: PipelineType;
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

const demoSessions: DemoSession[] = [
  {
    session_id: "demo_physical_001",
    pipeline_type: "checkout_physical",
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
      { step: "buyer_validated", status: "success", duration_ms: 120 },
      { step: "address_validated", status: "success", duration_ms: 85 },
      { step: "payment_initiated", status: "success", duration_ms: 340 },
      { step: "payment_confirmed", status: "success", duration_ms: 1200 },
      { step: "fulfillment_delegated", status: "success", duration_ms: 200 },
      { step: "checkout_completed", status: "success", duration_ms: 50 },
    ],
  },
  {
    session_id: "demo_digital_001",
    pipeline_type: "checkout_digital",
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
      { step: "buyer_validated", status: "success", duration_ms: 95 },
      { step: "payment_initiated", status: "success", duration_ms: 280 },
      { step: "payment_confirmed", status: "success", duration_ms: 950 },
      { step: "checkout_completed", status: "success", duration_ms: 45 },
    ],
  },
  {
    session_id: "demo_failed_001",
    pipeline_type: "checkout_physical",
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
      { step: "buyer_validated", status: "success", duration_ms: 110 },
      { step: "address_validated", status: "success", duration_ms: 90 },
      { step: "payment_initiated", status: "success", duration_ms: 320 },
      {
        step: "payment_confirmed",
        status: "failure",
        duration_ms: 1500,
        error: "Payment declined",
      },
      {
        step: "payment_confirmed",
        status: "success",
        duration_ms: 1400,
        sequence: 1,
      },
      { step: "fulfillment_delegated", status: "success", duration_ms: 180 },
      { step: "checkout_completed", status: "success", duration_ms: 60 },
    ],
  },
];

export async function generateDemoPipelineEvents(): Promise<{
  sessions: Array<{ session_id: string; pipeline_type: PipelineType; event_count: number }>;
}> {
  const tracker = getGlobalTracker();

  for (const session of demoSessions) {
    registerSessionId(session.session_id);

    for (const stepData of session.steps) {
      const event = createPipelineEvent({
        session_id: session.session_id,
        pipeline_type: session.pipeline_type,
        step: stepData.step,
        status: stepData.status,
        duration_ms: stepData.duration_ms,
        sequence: stepData.sequence ?? 0,
        error: stepData.error,
        handler: "demo",
        input_checksum: "a".repeat(64),
        output_checksum: "b".repeat(64),
        metadata: {
          demo: true,
          generated_at: getIsoTimestamp(),
          product_id: session.product.product_id,
          product_name: session.product.product_name,
          sku: session.product.sku,
          price: session.product.price,
          currency: session.product.currency,
          quantity: session.product.quantity,
          weight: session.product.weight,
          weight_unit: session.product.weight_unit,
          dimensions: session.product.dimensions,
        },
      });

      const definition =
        session.pipeline_type === "checkout_physical"
          ? PIPELINE_CHECKOUT_PHYSICAL
          : PIPELINE_CHECKOUT_DIGITAL;

      await tracker.trackEvent({ event, definition });
    }
  }

  return {
    sessions: demoSessions.map((session) => ({
      session_id: session.session_id,
      pipeline_type: session.pipeline_type,
      event_count: session.steps.length,
    })),
  };
}
