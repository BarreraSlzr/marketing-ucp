import Stripe from "stripe";
import {
    StripeCheckoutInputSchema,
    StripeCheckoutSessionSchema,
    StripePaymentIntentSchema,
    StripeRefundSchema,
    type StripeCheckoutInput,
    type StripeCheckoutSession,
    type StripePaymentIntent,
    type StripeRefund,
} from "./schemas";

export type StripeClientConfig = {
  secretKey: string;
  apiVersion?: string;
};

export type StripeClient = {
  createCheckoutSession: (params: {
    input: StripeCheckoutInput;
  }) => Promise<StripeCheckoutSession>;
  createRefund: (params: {
    paymentIntentId: string;
    amount?: number;
  }) => Promise<StripeRefund>;
  getPaymentIntent: (params: {
    id: string;
  }) => Promise<StripePaymentIntent>;
  constructWebhookEvent: (params: {
    body: string;
    signature: string;
    webhookSecret: string;
  }) => Stripe.Event;
};

class StripeClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StripeClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export function createStripeClient(config: StripeClientConfig): StripeClient {
  const stripe = new Stripe(config.secretKey);

  return {
    async createCheckoutSession(params) {
      const input = StripeCheckoutInputSchema.parse(params.input);

      try {
        const session = await stripe.checkout.sessions.create({
          mode: input.mode,
          line_items: input.line_items.map((item) => ({
            price_data: {
              currency: item.price_data.currency,
              product_data: {
                name: item.price_data.product_data.name,
                description: item.price_data.product_data.description ?? undefined,
              },
              unit_amount: item.price_data.unit_amount,
            },
            quantity: item.quantity,
          })),
          success_url: input.success_url,
          cancel_url: input.cancel_url,
          customer_email: input.customer_email ?? undefined,
          client_reference_id: input.client_reference_id ?? undefined,
          metadata: input.metadata ?? undefined,
        });

        return StripeCheckoutSessionSchema.parse({
          id: session.id,
          url: session.url,
          status: session.status,
          payment_status: session.payment_status,
          payment_intent: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
          client_secret: session.client_secret,
        });
      } catch (error) {
        throw new StripeClientError("Failed to create Stripe checkout session", error);
      }
    },

    async createRefund(params) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: params.paymentIntentId,
          amount: params.amount,
        });

        return StripeRefundSchema.parse({
          id: refund.id,
          status: refund.status,
          amount: refund.amount,
          currency: refund.currency,
          payment_intent: typeof refund.payment_intent === "string"
            ? refund.payment_intent
            : refund.payment_intent?.id ?? "",
        });
      } catch (error) {
        throw new StripeClientError("Failed to create Stripe refund", error);
      }
    },

    async getPaymentIntent(params) {
      try {
        const intent = await stripe.paymentIntents.retrieve(params.id);

        return StripePaymentIntentSchema.parse({
          id: intent.id,
          status: intent.status,
          amount: intent.amount,
          currency: intent.currency,
        });
      } catch (error) {
        throw new StripeClientError("Failed to retrieve Stripe payment intent", error);
      }
    },

    constructWebhookEvent(params) {
      try {
        return stripe.webhooks.constructEvent(
          params.body,
          params.signature,
          params.webhookSecret
        );
      } catch (error) {
        throw new StripeClientError("Stripe webhook signature verification failed", error);
      }
    },
  };
}
