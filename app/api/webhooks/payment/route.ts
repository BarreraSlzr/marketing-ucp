import { NextRequest, NextResponse } from "next/server";
import { getPaymentHandler } from "@repo/entities";
import type { WebhookEvent } from "@repo/entities";

/**
 * Webhook handler for payment events
 * 
 * This route accepts webhook notifications from payment providers
 * (Stripe, Polar, Thirdweb) and processes them to update order states.
 * 
 * POST /api/webhooks/payment
 * Body: JSON webhook event from payment provider
 * Header: provider-signature (Stripe-Signature, Polar-Signature, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    // Get provider from query param
    const provider = req.nextUrl.searchParams.get("provider") || "stripe";
    const body = await req.text();
    const signature =
      req.headers.get("stripe-signature") ||
      req.headers.get("polar-signature") ||
      req.headers.get("x-thirdweb-signature") ||
      "";

    // Get payment handler
    const handler = getPaymentHandler(provider);
    if (!handler) {
      return NextResponse.json(
        { error: `Payment handler '${provider}' not found` },
        { status: 404 }
      );
    }

    // Verify webhook signature
    const isValid = await handler.verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.warn(`Invalid webhook signature from ${provider}`);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Parse event
    const eventData = JSON.parse(body);
    const event: WebhookEvent = {
      id: eventData.id || `${provider}_${Date.now()}`,
      type: eventData.type || "unknown",
      timestamp: eventData.created
        ? new Date(eventData.created * 1000).toISOString()
        : new Date().toISOString(),
      source: (provider as any) || "custom",
      data: eventData,
      signature,
    };

    // Process webhook event through handler
    const orderUpdate = await handler.processWebhookEvent(event);

    // TODO: Update order in database
    // const order = await db.orders.update(orderUpdate);

    console.log(`[${provider}] Webhook processed:`, {
      eventId: event.id,
      type: event.type,
      timestamp: event.timestamp,
    });

    return NextResponse.json({ success: true, event: event.id });
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
  const provider = req.nextUrl.searchParams.get("provider");

  if (provider) {
    const handler = getPaymentHandler(provider);
    return NextResponse.json({
      provider,
      configured: !!handler,
    });
  }

  // List all configured handlers
  return NextResponse.json({
    providers: [
      "stripe",
      "polar",
      "thirdweb",
    ],
    webhook_url: `${req.nextUrl.origin}/api/webhooks/payment?provider=PROVIDER`,
  });
}
