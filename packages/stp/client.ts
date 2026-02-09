import {
    StpConciliationEntrySchema,
    StpSpeiInOrderSchema,
    StpSpeiInResponseSchema,
    StpSpeiOutOrderSchema,
    StpSpeiOutResponseSchema,
    type StpConciliationEntry,
    type StpSpeiInOrder,
    type StpSpeiInResponse,
    type StpSpeiOutOrder,
    type StpSpeiOutResponse,
} from "./schemas";

export type StpClientConfig = {
  empresa: string;
  apiKey: string;
  baseUrl: string;
  clabe: string;
};

export type StpClient = {
  /** Register an inbound SPEI order (cobro) to receive a payment */
  registerSpeiIn: (params: {
    input: StpSpeiInOrder;
  }) => Promise<StpSpeiInResponse>;
  /** Send an outbound SPEI transfer (dispersión / pago) */
  sendSpeiOut: (params: {
    input: StpSpeiOutOrder;
  }) => Promise<StpSpeiOutResponse>;
  /** Query conciliation for a date range */
  getConciliation: (params: {
    fecha: string;
  }) => Promise<StpConciliationEntry[]>;
  /** Get order status by claveRastreo */
  getOrderStatus: (params: {
    claveRastreo: string;
  }) => Promise<StpSpeiInResponse>;
  /** Verify webhook signature (HMAC-SHA256) */
  verifyWebhookSignature: (params: {
    body: string;
    signature: string;
    secret: string;
  }) => boolean;
};

class StpClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StpClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

function verifySTPSignature(params: {
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

export function createStpClient(config: StpClientConfig): StpClient {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  return {
    async registerSpeiIn(params) {
      const input = StpSpeiInOrderSchema.parse(params.input);

      try {
        const payload = {
          ...input,
          empresa: config.empresa,
          cuentaBeneficiario: input.cuentaBeneficiario ?? config.clabe,
        };

        const res = await fetch(
          `${config.baseUrl}/ordenPago/registra`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          throw new StpClientError(
            `STP register SPEI in failed: ${res.status}`
          );
        }

        const data = await res.json();
        return StpSpeiInResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof StpClientError) throw error;
        throw new StpClientError("Failed to register STP SPEI in order", error);
      }
    },

    async sendSpeiOut(params) {
      const input = StpSpeiOutOrderSchema.parse(params.input);

      try {
        const payload = {
          ...input,
          empresa: config.empresa,
          cuentaOrdenante: input.cuentaOrdenante ?? config.clabe,
        };

        const res = await fetch(
          `${config.baseUrl}/ordenPago/registra`,
          {
            method: "PUT",
            headers,
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          throw new StpClientError(
            `STP send SPEI out failed: ${res.status}`
          );
        }

        const data = await res.json();
        return StpSpeiOutResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof StpClientError) throw error;
        throw new StpClientError("Failed to send STP SPEI out", error);
      }
    },

    async getConciliation(params) {
      try {
        const res = await fetch(
          `${config.baseUrl}/ordenPago/consLiquidworka/${params.fecha}`,
          { headers }
        );

        if (!res.ok) {
          throw new StpClientError(
            `STP conciliation query failed: ${res.status}`
          );
        }

        const data = (await res.json()) as unknown[];
        return data.map((entry) => StpConciliationEntrySchema.parse(entry));
      } catch (error) {
        if (error instanceof StpClientError) throw error;
        throw new StpClientError(
          "Failed to get STP conciliation",
          error
        );
      }
    },

    async getOrderStatus(params) {
      try {
        const res = await fetch(
          `${config.baseUrl}/ordenPago/consulta/${params.claveRastreo}`,
          { headers }
        );

        if (!res.ok) {
          throw new StpClientError(
            `STP order status query failed: ${res.status}`
          );
        }

        const data = await res.json();
        return StpSpeiInResponseSchema.parse(data);
      } catch (error) {
        if (error instanceof StpClientError) throw error;
        throw new StpClientError(
          "Failed to get STP order status",
          error
        );
      }
    },

    verifyWebhookSignature: verifySTPSignature,
  };
}
