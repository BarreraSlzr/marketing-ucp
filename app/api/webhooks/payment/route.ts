import { registerPaymentHandlers } from "@/lib/payment-handlers";
import { getSharedPipelineStorage, registerSessionId } from "@/lib/pipeline-tracker";
import {
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
} from "@/lib/webhook-idempotency";
import { generateStamp, getIsoTimestamp, getIsoTimestampFromUnix } from "@/utils/stamp";
import {
  getPaymentHandler,
  WebhookEventSchema,
  WebhookEventTypeSchema,
  type WebhookEvent,
} from "@repo/entities";
import {
  PipelineEmitter,
  PipelineTypeSchema,
  tracedStep,
  type PipelineStorage,
  type PipelineType,
} from "@repo/pipeline";
import { Effect } from "effect";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook handler for payment events
 * 
 * This route accepts webhook notifications from payment providers
 * (Stripe, Polar, Thirdweb) and processes them to update order states.
 * 
 * POST /api/webhooks/payment?handler=polar
 * Body: JSON webhook event from payment provider
 * Header: x-ucp-handler, x-ucp-signature, or provider-specific signature
 */
function getHandlerName(params: { req: NextRequest }): string | null {
  return (
    params.req.nextUrl.searchParams.get("handler") ||
    params.req.headers.get("x-ucp-handler")
  );
}

function getSignature(params: { req: NextRequest }): string {
  return (
    params.req.headers.get("x-ucp-signature") ||
    params.req.headers.get("polar-signature") ||
    params.req.headers.get("stripe-signature") ||
    params.req.headers.get("x-thirdweb-signature") ||
    ""
  );
}

function parsePipelineTypeCandidate(params: { raw?: unknown }): PipelineType | null {
  if (typeof params.raw !== "string") {
    return null;
  }

  const parsed = PipelineTypeSchema.safeParse(params.raw);
  return parsed.success ? parsed.data : null;
}

function getPayloadMetadata(params: {
  payload: Record<string, unknown>;
}): Record<string, unknown> | undefined {
  const data = params.payload.data as Record<string, unknown> | undefined;
  const dataObject = data?.object as Record<string, unknown> | undefined;

  return (
    (dataObject?.metadata as Record<string, unknown> | undefined) ??
    (data?.metadata as Record<string, unknown> | undefined) ??
    (params.payload.metadata as Record<string, unknown> | undefined)
  );
}

function resolvePipelineTypeFromRequest(params: { req: NextRequest }): PipelineType | null {
  const pipelineType =
    params.req.nextUrl.searchParams.get("pipeline_type") ||
    params.req.headers.get("x-ucp-pipeline-type");

  return parsePipelineTypeCandidate({ raw: pipelineType });
}

async function resolvePipelineType(params: {
  req: NextRequest;
  payload: Record<string, unknown>;
  session_id: string;
  storage: PipelineStorage;
}): Promise<PipelineType> {
  const fromRequest = resolvePipelineTypeFromRequest({ req: params.req });
  if (fromRequest) {
    return fromRequest;
  }

  const metadata = getPayloadMetadata({ payload: params.payload });
  const data = params.payload.data as Record<string, unknown> | undefined;
  const dataObject = data?.object as Record<string, unknown> | undefined;
  const candidates = [
    params.payload.pipeline_type,
    params.payload.checkout_pipeline_type,
    data?.pipeline_type,
    data?.checkout_pipeline_type,
    metadata?.pipeline_type,
    metadata?.checkout_pipeline_type,
    dataObject?.pipeline_type,
    dataObject?.checkout_pipeline_type,
  ];

  for (const candidate of candidates) {
    const parsed = parsePipelineTypeCandidate({ raw: candidate });
    if (parsed) {
      return parsed;
    }
  }

  const storedEvents = await params.storage.getBySessionId({
    session_id: params.session_id,
  });

  for (const event of storedEvents) {
    const parsed = parsePipelineTypeCandidate({ raw: event.pipeline_type });
    if (parsed) {
      return parsed;
    }
  }

  const hasAddress = Boolean(
    (dataObject?.shipping as Record<string, unknown> | undefined) ??
      (dataObject?.shipping_address as Record<string, unknown> | undefined) ??
      (data?.shipping as Record<string, unknown> | undefined) ??
      (data?.shipping_address as Record<string, unknown> | undefined) ??
      (metadata?.shipping_line1 as string | undefined) ??
      (metadata?.billing_line1 as string | undefined)
  );

  const isSubscription = Boolean(
    (dataObject?.mode as string | undefined) === "subscription" ||
      (dataObject?.subscription as string | undefined) ||
      (data?.subscription as string | undefined) ||
      (metadata?.subscription_id as string | undefined) ||
      (metadata?.subscriptionId as string | undefined)
  );

  const isAntifraud = Boolean(
    (metadata?.antifraud_enabled as boolean | undefined) ||
      (metadata?.fraud_check as boolean | undefined) ||
      (metadata?.fraud_check_required as boolean | undefined) ||
      (metadata?.antifraud as boolean | undefined) ||
      (metadata?.fraud as boolean | undefined)
  );

  if (isSubscription) {
    return isAntifraud
      ? "checkout_subscription_antifraud"
      : "checkout_subscription";
  }

  if (isAntifraud) {
    return hasAddress
      ? "checkout_physical_antifraud"
      : "checkout_digital_antifraud";
  }

  return hasAddress ? "checkout_physical" : "checkout_digital";
}

function toSafeSessionId(params: { raw?: string }): string {
  const fallback = `webhook_${generateStamp()}`;
  if (!params.raw) {
    return fallback;
  }

  const cleaned = params.raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extractSessionId(params: { payload: Record<string, unknown> }): string {
  const data = params.payload.data as Record<string, unknown> | undefined;
  const metadata = data?.metadata as Record<string, unknown> | undefined;

  const candidates = [
    metadata?.session_id,
    metadata?.checkout_id,
    metadata?.order_id,
    data?.session_id,
    data?.order_id,
    data?.id,
    params.payload.id,
  ].filter((value): value is string => typeof value === "string");

  return toSafeSessionId({ raw: candidates[0] });
}

function resolveWebhookType(params: { raw?: string }): string {
  const parsed = WebhookEventTypeSchema.safeParse(params.raw);
  return parsed.success ? parsed.data : "order.created";
}

function resolveWebhookSource(params: { handlerName: string }): WebhookEvent["source"] {
  const sources: WebhookEvent["source"][] = [
    "stripe",
    "polar",
    "shopify",
    "thirdweb",
    "custom",
  ];

  return sources.includes(params.handlerName as WebhookEvent["source"])
    ? (params.handlerName as WebhookEvent["source"])
    : "custom";
}

export async function POST(req: NextRequest) {
  try {
    registerPaymentHandlers();

    const handlerName = getHandlerName({ req });
    if (!handlerName) {
      return NextResponse.json(
        { error: "Missing handler name" },
        { status: 400 }
      );
    }

    const handler = getPaymentHandler(handlerName);
    if (!handler) {
      return NextResponse.json(
        { error: `Payment handler '${handlerName}' not found` },
        { status: 404 }
      );
    }

    const body = await req.text();
    const signature = getSignature({ req });

    let rawEvent: Record<string, unknown>;
    try {
      rawEvent = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const session_id = extractSessionId({ payload: rawEvent });
    registerSessionId(session_id);

    const storage = getSharedPipelineStorage();
    const pipeline_type = await resolvePipelineType({
      req,
      payload: rawEvent,
      session_id,
      storage,
    });

    const emitter = new PipelineEmitter({ storage });

    const verifyEffect = tracedStep({
      session_id,
      pipeline_type,
      step: "webhook_verified",
      handler: handlerName,
      input: { signature, body },
      metadata: {
        handler: handlerName,
        pipeline_type,
      },
      effect: Effect.tryPromise({
        try: async () => {
          const isValid = await handler.verifyWebhookSignature(body, signature);
          if (!isValid) {
            throw new Error("Invalid signature");
          }
          return { verified: true };
        },
        catch: (error) => error as Error,
      }),
      emitter,
    });

    const verifyOutcome = await Effect.runPromise(Effect.either(verifyEffect));
    if (verifyOutcome._tag === "Left") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const eventId =
      typeof rawEvent.id === "string"
        ? rawEvent.id
        : `${handlerName}_${generateStamp()}`;

    if (await hasProcessedWebhookEvent({ event_id: eventId })) {
      return NextResponse.json({ success: true, event: eventId, duplicate: true });
    }

    const event: WebhookEvent = WebhookEventSchema.parse({
      id: eventId,
      type: resolveWebhookType({ raw: rawEvent.type as string | undefined }),
      timestamp:
        typeof rawEvent.created === "number"
          ? getIsoTimestampFromUnix({ seconds: rawEvent.created })
          : getIsoTimestamp(),
      source: resolveWebhookSource({ handlerName }),
      data: rawEvent,
      signature,
    });

    const processEffect = tracedStep({
      session_id,
      pipeline_type,
      step: "webhook_received",
      handler: handlerName,
      input: { event_id: event.id, type: event.type, source: event.source },
      metadata: {
        handler: handlerName,
        pipeline_type,
        event_id: event.id,
        event_type: event.type,
      },
      effect: Effect.tryPromise({
        try: () => handler.processWebhookEvent(event),
        catch: (error) => error as Error,
      }),
      emitter,
    });

    const outcome = await Effect.runPromise(Effect.either(processEffect));
    if (outcome._tag === "Left") {
      return NextResponse.json(
        { error: "Failed to process webhook event" },
        { status: 500 }
      );
    }

    await markWebhookEventProcessed({ event_id: event.id });

    return NextResponse.json({
      success: true,
      event: event.id,
      session_id,
      order: outcome.right,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for webhook health check
 */
export async function GET(req: NextRequest) {
  registerPaymentHandlers();
  const handler = req.nextUrl.searchParams.get("handler");

  if (handler) {
    const resolved = getPaymentHandler(handler);
    return NextResponse.json({
      handler,
      configured: !!resolved,
    });
  }

  // List all configured handlers
  return NextResponse.json({
    handlers: ["stripe", "polar", "thirdweb"],
    webhook_url: `${req.nextUrl.origin}/api/webhooks/payment?handler=HANDLER`,
  });
}
