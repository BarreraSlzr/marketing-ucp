import {
    ThirdwebCheckoutInputSchema,
    ThirdwebCheckoutSessionSchema,
    ThirdwebTransactionStatusSchema,
    type ThirdwebCheckoutInput,
    type ThirdwebCheckoutSession,
    type ThirdwebTransactionStatus,
} from "./schemas";

export type ThirdwebClientConfig = {
  secretKey: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export type ThirdwebClient = {
  createCheckoutSession: (params: {
    input: ThirdwebCheckoutInput;
  }) => Promise<ThirdwebCheckoutSession>;
  getTransactionStatus: (params: {
    transactionHash: string;
    chainId: number;
  }) => Promise<ThirdwebTransactionStatus>;
};

class ThirdwebClientError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ThirdwebClientError";
    if (cause) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export function createThirdwebClient(config: ThirdwebClientConfig): ThirdwebClient {
  const baseUrl = config.baseUrl ?? "https://pay.thirdweb.com/api/v1";
  const fetcher = config.fetcher ?? fetch;

  async function request(params: {
    path: string;
    method: "GET" | "POST";
    body?: unknown;
  }) {
    const res = await fetcher(`${baseUrl}${params.path}`, {
      method: params.method,
      headers: {
        "x-secret-key": config.secretKey,
        "Content-Type": "application/json",
      },
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new ThirdwebClientError(
        `Thirdweb API request failed: ${res.status} ${text}`
      );
    }

    return res.json();
  }

  return {
    async createCheckoutSession(params) {
      const input = ThirdwebCheckoutInputSchema.parse(params.input);

      const data = await request({
        path: "/checkout/create",
        method: "POST",
        body: {
          title: input.title,
          seller_address: input.seller_address,
          chain_id: input.chain_id,
          token_address: input.token_address,
          amount: input.amount,
          success_url: input.success_url,
          cancel_url: input.cancel_url,
          client_reference_id: input.client_reference_id,
          metadata: input.metadata,
        },
      });

      return ThirdwebCheckoutSessionSchema.parse(data);
    },

    async getTransactionStatus(params) {
      const data = await request({
        path: `/transaction/status?hash=${encodeURIComponent(params.transactionHash)}&chain_id=${params.chainId}`,
        method: "GET",
      });

      return ThirdwebTransactionStatusSchema.parse(data);
    },
  };
}
