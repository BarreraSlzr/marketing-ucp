export type StpEnv = {
  /** STP empresa (company alias) */
  empresa: string;
  /** Private key or API key for signing requests */
  apiKey: string;
  /** Webhook signature secret */
  webhookSecret: string;
  /** CLABE account registered in STP */
  clabe: string;
  /** "sandbox" | "production" */
  environment: "sandbox" | "production";
};

export function getStpEnv(): StpEnv {
  const empresa = process.env.STP_EMPRESA;
  const apiKey = process.env.STP_API_KEY;
  const webhookSecret = process.env.STP_WEBHOOK_SECRET;
  const clabe = process.env.STP_CLABE;
  const environment = (process.env.STP_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "production";

  if (!empresa) {
    throw new Error("STP_EMPRESA is required");
  }

  if (!apiKey) {
    throw new Error("STP_API_KEY is required");
  }

  if (!webhookSecret) {
    throw new Error("STP_WEBHOOK_SECRET is required");
  }

  if (!clabe) {
    throw new Error("STP_CLABE is required");
  }

  return { empresa, apiKey, webhookSecret, clabe, environment };
}

/**
 * Resolve STP API base URL from environment setting.
 */
export function getStpBaseUrl(env: "sandbox" | "production"): string {
  return env === "production"
    ? "https://prod.stpmex.com/speiws/rest"
    : "https://demo.stpmex.com/speiws/rest";
}
