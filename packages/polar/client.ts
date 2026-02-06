import {
    PolarCheckoutInputSchema,
    PolarCheckoutSessionSchema,
    type PolarCheckoutInput,
    type PolarCheckoutSession,
} from "./schemas";

export type PolarClientConfig = {
  apiKey: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export type PolarClient = {
  createCheckoutSession: (params: {
    input: PolarCheckoutInput;
  }) => Promise<PolarCheckoutSession>;
};

class PolarClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "PolarClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export function createPolarClient(config: PolarClientConfig): PolarClient {
  const baseUrl = config.baseUrl ?? "https://api.polar.sh/v1";
  const fetcher = config.fetcher ?? fetch;

  async function request(params: {
    path: string;
    method: "GET" | "POST";
    body?: unknown;
  }) {
    const res = await fetcher(`${baseUrl}${params.path}`, {
      method: params.method,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PolarClientError(
        `Polar API request failed: ${res.status} ${text}`
      );
    }

    return res.json();
  }

  return {
    async createCheckoutSession(params) {
      const input = PolarCheckoutInputSchema.parse(params.input);
      const payload = {
        order_id: input.order_id,
        currency: input.currency,
        line_items: input.line_items,
        success_url: input.success_url,
        cancel_url: input.cancel_url,
        customer_email: input.customer_email,
        metadata: input.metadata,
      };

      const data = await request({
        path: "/checkout/sessions",
        method: "POST",
        body: payload,
      });

      return PolarCheckoutSessionSchema.parse(data);
    },
  };
}
