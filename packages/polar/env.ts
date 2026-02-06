export type PolarEnv = {
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
};

export function getPolarEnv(): PolarEnv {
  const apiKey = process.env.POLAR_API_KEY;
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  const baseUrl = process.env.POLAR_BASE_URL;

  if (!apiKey) {
    throw new Error("POLAR_API_KEY is required");
  }

  if (!webhookSecret) {
    throw new Error("POLAR_WEBHOOK_SECRET is required");
  }

  return {
    apiKey,
    webhookSecret,
    baseUrl,
  };
}
