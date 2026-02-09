import {
    MercadoPagoPaymentSchema,
    MercadoPagoPreferenceInputSchema,
    MercadoPagoPreferenceResponseSchema,
    MercadoPagoRefundSchema,
    type MercadoPagoPayment,
    type MercadoPagoPreferenceInput,
    type MercadoPagoPreferenceResponse,
    type MercadoPagoRefund,
} from "./schemas";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com";

export type MercadoPagoClientConfig = {
  accessToken: string;
};

export type MercadoPagoClient = {
  createPreference: (params: {
    input: MercadoPagoPreferenceInput;
  }) => Promise<MercadoPagoPreferenceResponse>;
  getPayment: (params: { paymentId: string }) => Promise<MercadoPagoPayment>;
  createRefund: (params: {
    paymentId: string;
    amount?: number;
  }) => Promise<MercadoPagoRefund>;
  verifyWebhookSignature: (params: {
    xSignature: string;
    xRequestId: string;
    dataId: string;
    secret: string;
  }) => boolean;
};

class MercadoPagoClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "MercadoPagoClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/**
 * Verify MercadoPago webhook signature using HMAC-SHA256.
 *
 * MercadoPago sends:
 *   x-signature: ts=<timestamp>,v1=<hmac>
 *   x-request-id: <uuid>
 *
 * The HMAC is computed over: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
function verifyMPSignature(params: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}): boolean {
  try {
    const parts = params.xSignature.split(",");
    const tsEntry = parts.find((p) => p.trim().startsWith("ts="));
    const v1Entry = parts.find((p) => p.trim().startsWith("v1="));

    if (!tsEntry || !v1Entry) return false;

    const ts = tsEntry.split("=")[1];
    const hash = v1Entry.split("=")[1];

    // Build the manifest string per MercadoPago docs
    const manifest = `id:${params.dataId};request-id:${params.xRequestId};ts:${ts};`;

    // Use Web Crypto / Node crypto for HMAC-SHA256
    const crypto = globalThis.crypto ?? require("node:crypto").webcrypto;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(params.secret);
    const msgData = encoder.encode(manifest);

    // Synchronous comparison using Node crypto when available
    const nodeCrypto = require("node:crypto");
    const hmac = nodeCrypto
      .createHmac("sha256", params.secret)
      .update(manifest)
      .digest("hex");

    return nodeCrypto.timingSafeEqual(
      Buffer.from(hmac),
      Buffer.from(hash ?? "")
    );
  } catch {
    return false;
  }
}

export function createMercadoPagoClient(
  config: MercadoPagoClientConfig
): MercadoPagoClient {
  const headers = {
    Authorization: `Bearer ${config.accessToken}`,
    "Content-Type": "application/json",
  };

  return {
    async createPreference(params) {
      const input = MercadoPagoPreferenceInputSchema.parse(params.input);

      try {
        const res = await fetch(
          `${MERCADOPAGO_API_BASE}/checkout/preferences`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(input),
          }
        );

        if (!res.ok) {
          throw new MercadoPagoClientError(
            `MercadoPago create preference failed: ${res.status}`
          );
        }

        const data = await res.json();
        return MercadoPagoPreferenceResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof MercadoPagoClientError) throw error;
        throw new MercadoPagoClientError(
          "Failed to create MercadoPago preference",
          error
        );
      }
    },

    async getPayment(params) {
      try {
        const res = await fetch(
          `${MERCADOPAGO_API_BASE}/v1/payments/${params.paymentId}`,
          { headers }
        );

        if (!res.ok) {
          throw new MercadoPagoClientError(
            `MercadoPago get payment failed: ${res.status}`
          );
        }

        const data = await res.json();
        return MercadoPagoPaymentSchema.parse(data);
      } catch (error) {
        if (error instanceof MercadoPagoClientError) throw error;
        throw new MercadoPagoClientError(
          "Failed to get MercadoPago payment",
          error
        );
      }
    },

    async createRefund(params) {
      try {
        const body: Record<string, unknown> = {};
        if (params.amount != null) {
          body.amount = params.amount;
        }

        const res = await fetch(
          `${MERCADOPAGO_API_BASE}/v1/payments/${params.paymentId}/refunds`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          }
        );

        if (!res.ok) {
          throw new MercadoPagoClientError(
            `MercadoPago refund failed: ${res.status}`
          );
        }

        const data = await res.json();
        return MercadoPagoRefundSchema.parse(data);
      } catch (error) {
        if (error instanceof MercadoPagoClientError) throw error;
        throw new MercadoPagoClientError(
          "Failed to create MercadoPago refund",
          error
        );
      }
    },

    verifyWebhookSignature: verifyMPSignature,
  };
}
