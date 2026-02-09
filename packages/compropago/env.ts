export type CompropagoEnv = {
  apiKey: string;
  publicKey: string;
  webhookSecret: string;
  /** "sandbox" | "live" */
  environment: "sandbox" | "live";
};

export function getCompropagoEnv(): CompropagoEnv {
  const apiKey = process.env.COMPROPAGO_API_KEY;
  const publicKey = process.env.COMPROPAGO_PUBLIC_KEY;
  const webhookSecret = process.env.COMPROPAGO_WEBHOOK_SECRET;
  const environment = (process.env.COMPROPAGO_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "live";

  if (!apiKey) {
    throw new Error("COMPROPAGO_API_KEY is required");
  }

  if (!publicKey) {
    throw new Error("COMPROPAGO_PUBLIC_KEY is required");
  }

  if (!webhookSecret) {
    throw new Error("COMPROPAGO_WEBHOOK_SECRET is required");
  }

  return { apiKey, publicKey, webhookSecret, environment };
}
