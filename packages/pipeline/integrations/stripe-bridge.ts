import Stripe from "stripe";
import { linkSessionToPlatform } from "../cross-platform-bridge";

// LEGEND: Stripe integration bridge
// Maps internal sessions to Stripe Payment Intents and Customers
// All usage must comply with this LEGEND and the LICENSE

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_mock", {
  apiVersion: "2024-12-18.acacia",
});

interface LinkStripeSessionParams {
  sessionId: string;
  pipelineId: string;
  stripePaymentIntentId: string;
}

/**
 * Link internal session to Stripe Payment Intent
 */
export async function linkStripeSession(
  params: LinkStripeSessionParams
): Promise<void> {
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "stripe",
    externalId: params.stripePaymentIntentId,
    metadata: {
      pipelineId: params.pipelineId,
    },
  });
}

interface FetchExternalDataParams {
  externalId: string;
}

/**
 * Fetch Stripe Payment Intent data
 * Expands customer and payment_method for complete context
 */
export async function fetchExternalData(
  params: FetchExternalDataParams
): Promise<Stripe.PaymentIntent> {
  return await stripe.paymentIntents.retrieve(params.externalId, {
    expand: ["customer", "payment_method"],
  });
}

/**
 * Link session to Stripe Customer ID
 */
export async function linkStripeCustomer(params: {
  sessionId: string;
  stripeCustomerId: string;
}): Promise<void> {
  await linkSessionToPlatform({
    sessionId: params.sessionId,
    platform: "stripe-customer",
    externalId: params.stripeCustomerId,
  });
}

/**
 * Fetch Stripe Customer data
 */
export async function fetchStripeCustomer(params: {
  customerId: string;
}): Promise<Stripe.Customer> {
  return (await stripe.customers.retrieve(params.customerId, {
    expand: ["subscriptions"],
  })) as Stripe.Customer;
}
