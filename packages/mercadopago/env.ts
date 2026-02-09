export type MercadoPagoEnv = {
  accessToken: string;
  webhookSecret: string;
  /** "sandbox" | "production" — controls init_point vs sandbox_init_point */
  environment: "sandbox" | "production";
};

export function getMercadoPagoEnv(): MercadoPagoEnv {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  const environment = (process.env.MERCADOPAGO_ENVIRONMENT ?? "sandbox") as
    | "sandbox"
    | "production";

  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN is required");
  }

  if (!webhookSecret) {
    throw new Error("MERCADOPAGO_WEBHOOK_SECRET is required");
  }

  return { accessToken, webhookSecret, environment };
}
