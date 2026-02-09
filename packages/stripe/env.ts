export type StripeEnv = {
  secretKey: string;
  webhookSecret: string;
};

export function getStripeEnv(): StripeEnv {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required");
  }

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is required");
  }

  return {
    secretKey,
    webhookSecret,
  };
}
