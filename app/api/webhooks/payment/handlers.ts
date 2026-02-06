import { registerPaymentHandler } from "@repo/entities";
import {
    createPolarClient,
    createPolarPaymentHandler,
    getPolarEnv,
} from "@repo/polar";

let registered = false;

export function registerPaymentHandlers() {
  if (registered) {
    return;
  }

  registered = true;

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
}
