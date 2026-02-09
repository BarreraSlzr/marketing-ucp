export type PayPalMxEnv = {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  /** "sandbox" or "live" — maps to PayPal API base URL */
  environment: "sandbox" | "live";
};

export function getPayPalMxEnv(): PayPalMxEnv {
  const clientId = process.env.PAYPAL_MX_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_MX_CLIENT_SECRET;
  const webhookId = process.env.PAYPAL_MX_WEBHOOK_ID;
  const environment = (process.env.PAYPAL_MX_ENVIRONMENT ?? "sandbox") as "sandbox" | "live";

  if (!clientId) {
    throw new Error("PAYPAL_MX_CLIENT_ID is required");
  }

  if (!clientSecret) {
    throw new Error("PAYPAL_MX_CLIENT_SECRET is required");
  }

  if (!webhookId) {
    throw new Error("PAYPAL_MX_WEBHOOK_ID is required");
  }

  return { clientId, clientSecret, webhookId, environment };
}

/**
 * Resolve PayPal API base URL from environment setting.
 */
export function getPayPalBaseUrl(env: "sandbox" | "live"): string {
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}
