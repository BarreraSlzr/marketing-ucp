import {
    PayPalMxCheckoutInputSchema,
    PayPalMxOrderResponseSchema,
    PayPalMxRefundSchema,
    type PayPalMxCheckoutInput,
    type PayPalMxOrderResponse,
    type PayPalMxRefund,
} from "./schemas";

export type PayPalMxClientConfig = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
};

export type PayPalMxClient = {
  createOrder: (params: {
    input: PayPalMxCheckoutInput;
  }) => Promise<PayPalMxOrderResponse>;
  captureOrder: (params: { orderId: string }) => Promise<Record<string, unknown>>;
  createRefund: (params: {
    captureId: string;
    amount?: { currency_code: string; value: string };
  }) => Promise<PayPalMxRefund>;
  getOrderDetails: (params: { orderId: string }) => Promise<Record<string, unknown>>;
  verifyWebhookSignature: (params: {
    webhookId: string;
    headers: Record<string, string>;
    body: string;
  }) => Promise<boolean>;
};

class PayPalMxClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PayPalMxClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Fetch an OAuth2 access token using client credentials.
 */
async function getAccessToken(config: PayPalMxClientConfig): Promise<string> {
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const res = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new PayPalMxClientError(
      `Failed to obtain PayPal access token: ${res.status}`
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export function createPayPalMxClient(
  config: PayPalMxClientConfig
): PayPalMxClient {
  return {
    async createOrder(params) {
      const input = PayPalMxCheckoutInputSchema.parse(params.input);
      const token = await getAccessToken(config);

      try {
        const res = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            intent: input.intent,
            purchase_units: input.purchase_units,
            application_context: input.application_context,
          }),
        });

        if (!res.ok) {
          throw new PayPalMxClientError(
            `PayPal create order failed: ${res.status}`
          );
        }

        const data = await res.json();
        return PayPalMxOrderResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof PayPalMxClientError) throw error;
        throw new PayPalMxClientError("Failed to create PayPal order", error);
      }
    },

    async captureOrder(params) {
      const token = await getAccessToken(config);

      try {
        const res = await fetch(
          `${config.baseUrl}/v2/checkout/orders/${params.orderId}/capture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new PayPalMxClientError(
            `PayPal capture order failed: ${res.status}`
          );
        }

        return (await res.json()) as Record<string, unknown>;
      } catch (error) {
        if (error instanceof PayPalMxClientError) throw error;
        throw new PayPalMxClientError("Failed to capture PayPal order", error);
      }
    },

    async createRefund(params) {
      const token = await getAccessToken(config);

      try {
        const body: Record<string, unknown> = {};
        if (params.amount) {
          body.amount = params.amount;
        }

        const res = await fetch(
          `${config.baseUrl}/v2/payments/captures/${params.captureId}/refund`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          throw new PayPalMxClientError(
            `PayPal refund failed: ${res.status}`
          );
        }

        const data = await res.json();
        return PayPalMxRefundSchema.parse(data);
      } catch (error) {
        if (error instanceof PayPalMxClientError) throw error;
        throw new PayPalMxClientError("Failed to create PayPal refund", error);
      }
    },

    async getOrderDetails(params) {
      const token = await getAccessToken(config);

      try {
        const res = await fetch(
          `${config.baseUrl}/v2/checkout/orders/${params.orderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new PayPalMxClientError(
            `PayPal get order failed: ${res.status}`
          );
        }

        return (await res.json()) as Record<string, unknown>;
      } catch (error) {
        if (error instanceof PayPalMxClientError) throw error;
        throw new PayPalMxClientError(
          "Failed to get PayPal order details",
          error
        );
      }
    },

    async verifyWebhookSignature(params) {
      const token = await getAccessToken(config);

      try {
        const res = await fetch(
          `${config.baseUrl}/v1/notifications/verify-webhook-signature`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              webhook_id: params.webhookId,
              transmission_id: params.headers["paypal-transmission-id"],
              transmission_time: params.headers["paypal-transmission-time"],
              cert_url: params.headers["paypal-cert-url"],
              auth_algo: params.headers["paypal-auth-algo"],
              transmission_sig: params.headers["paypal-transmission-sig"],
              webhook_event: JSON.parse(params.body),
            }),
          }
        );

        if (!res.ok) {
          return false;
        }

        const data = (await res.json()) as {
          verification_status: string;
        };
        return data.verification_status === "SUCCESS";
      } catch {
        return false;
      }
    },
  };
}
