// LEGEND: Payment handler registry bootstrap for API routes
// Central place to register available payment handlers at runtime
// All usage must comply with this LEGEND and the LICENSE

import { registerPaymentHandler } from "@repo/entities";
import {
    createPolarClient,
    createPolarPaymentHandler,
    getPolarEnv,
} from "@repo/polar";
import {
    createStripeClient,
    createStripePaymentHandler,
    getStripeEnv,
} from "@repo/stripe";
import {
    createThirdwebClient,
    createThirdwebPaymentHandler,
    getThirdwebEnv,
} from "@repo/thirdweb";

let registered = false;

export function registerPaymentHandlers(): void {
  if (registered) {
    return;
  }

  registered = true;

  // Polar
  try {
    const env = getPolarEnv();
    const client = createPolarClient({
      apiKey: env.apiKey,
      baseUrl: env.baseUrl,
    });
    const handler = createPolarPaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
    });
    registerPaymentHandler("polar", handler);
  } catch {
    // Env not configured, skip polar registration.
  }

  // Stripe
  try {
    const env = getStripeEnv();
    const client = createStripeClient({ secretKey: env.secretKey });
    const handler = createStripePaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
    });
    registerPaymentHandler("stripe", handler);
  } catch {
    // Env not configured, skip stripe registration.
  }

  // Thirdweb
  try {
    const env = getThirdwebEnv();
    const client = createThirdwebClient({ secretKey: env.secretKey });
    const handler = createThirdwebPaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
      defaultChainId: env.defaultChainId,
    });
    registerPaymentHandler("thirdweb", handler);
  } catch {
    // Env not configured, skip thirdweb registration.
  }
}
