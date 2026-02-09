export type ThirdwebEnv = {
  secretKey: string;
  webhookSecret: string;
  defaultChainId: number;
};

export function getThirdwebEnv(): ThirdwebEnv {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  const webhookSecret = process.env.THIRDWEB_WEBHOOK_SECRET;
  const defaultChainId = Number(process.env.THIRDWEB_CHAIN_ID ?? "1");

  if (!secretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is required");
  }

  if (!webhookSecret) {
    throw new Error("THIRDWEB_WEBHOOK_SECRET is required");
  }

  if (!Number.isFinite(defaultChainId) || defaultChainId < 1) {
    throw new Error("THIRDWEB_CHAIN_ID must be a positive integer");
  }

  return {
    secretKey,
    webhookSecret,
    defaultChainId,
  };
}
