import {
    CompropagoChargeInputSchema,
    CompropagoChargeResponseSchema,
    type CompropagoChargeInput,
    type CompropagoChargeResponse,
} from "./schemas";

const COMPROPAGO_API_BASE = "https://api.compropago.com";

export type CompropagoClientConfig = {
  apiKey: string;
  publicKey: string;
};

export type CompropagoClient = {
  createCharge: (params: {
    input: CompropagoChargeInput;
  }) => Promise<CompropagoChargeResponse>;
  getCharge: (params: {
    chargeId: string;
  }) => Promise<CompropagoChargeResponse>;
  verifyWebhookSignature: (params: {
    body: string;
    signature: string;
    secret: string;
  }) => boolean;
};

class CompropagoClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CompropagoClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Verify Compropago webhook signature using HMAC-SHA256.
 */
function verifyCPSignature(params: {
  body: string;
  signature: string;
  secret: string;
}): boolean {
  try {
    const crypto = require("node:crypto");
    const hmac = crypto
      .createHmac("sha256", params.secret)
      .update(params.body)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(params.signature)
    );
  } catch {
    return false;
  }
}

export function createCompropagoClient(
  config: CompropagoClientConfig
): CompropagoClient {
  const authHeader = `Basic ${Buffer.from(
    `${config.apiKey}:${config.publicKey}`
  ).toString("base64")}`;

  return {
    async createCharge(params) {
      const input = CompropagoChargeInputSchema.parse(params.input);

      try {
        const res = await fetch(`${COMPROPAGO_API_BASE}/v1/charges`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            order_id: input.order_id,
            order_name: input.order_name,
            order_price: input.order_price,
            customer_name: input.customer_name,
            customer_email: input.customer_email,
            payment_type: input.payment_type,
            currency: input.currency,
            image_url: input.image_url,
            success_url: input.success_url,
          }),
        });

        if (!res.ok) {
          throw new CompropagoClientError(
            `Compropago create charge failed: ${res.status}`
          );
        }

        const data = await res.json();
        return CompropagoChargeResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof CompropagoClientError) throw error;
        throw new CompropagoClientError(
          "Failed to create Compropago charge",
          error
        );
      }
    },

    async getCharge(params) {
      try {
        const res = await fetch(
          `${COMPROPAGO_API_BASE}/v1/charges/${params.chargeId}`,
          {
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          throw new CompropagoClientError(
            `Compropago get charge failed: ${res.status}`
          );
        }

        const data = await res.json();
        return CompropagoChargeResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof CompropagoClientError) throw error;
        throw new CompropagoClientError(
          "Failed to get Compropago charge",
          error
        );
      }
    },

    verifyWebhookSignature: verifyCPSignature,
  };
}
