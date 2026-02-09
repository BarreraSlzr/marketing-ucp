// LEGEND: Payment handler registry bootstrap for API routes
// Central place to register available payment handlers at runtime
// All usage must comply with this LEGEND and the LICENSE

import {
    createCompropagoClient,
    createCompropagoPaymentHandler,
    getCompropagoEnv,
} from "@repo/compropago";
import { registerPaymentHandler } from "@repo/entities";
import {
    createMercadoPagoClient,
    createMercadoPagoPaymentHandler,
    getMercadoPagoEnv,
} from "@repo/mercadopago";
import {
    createPayPalMxClient,
    createPayPalMxPaymentHandler,
    getPayPalBaseUrl,
    getPayPalMxEnv,
} from "@repo/paypal-mx";
import {
    createPolarClient,
    createPolarPaymentHandler,
    getPolarEnv,
} from "@repo/polar";
import {
    createStpClient,
    createStpPaymentHandler,
    getStpBaseUrl,
    getStpEnv,
} from "@repo/stp";
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

  // PayPal México (IFPE)
  try {
    const env = getPayPalMxEnv();
    const client = createPayPalMxClient({
      clientId: env.clientId,
      clientSecret: env.clientSecret,
      baseUrl: getPayPalBaseUrl(env.environment),
    });
    const handler = createPayPalMxPaymentHandler({
      client,
      webhookId: env.webhookId,
    });
    registerPaymentHandler("paypal-mx", handler);
  } catch {
    // Env not configured, skip PayPal MX registration.
  }

  // MercadoPago (IFPE)
  try {
    const env = getMercadoPagoEnv();
    const client = createMercadoPagoClient({
      accessToken: env.accessToken,
    });
    const handler = createMercadoPagoPaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
      environment: env.environment,
    });
    registerPaymentHandler("mercadopago", handler);
  } catch {
    // Env not configured, skip MercadoPago registration.
  }

  // Compropago (IFPE)
  try {
    const env = getCompropagoEnv();
    const client = createCompropagoClient({
      apiKey: env.apiKey,
      publicKey: env.publicKey,
    });
    const handler = createCompropagoPaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
    });
    registerPaymentHandler("compropago", handler);
  } catch {
    // Env not configured, skip Compropago registration.
  }

  // STP SPEI (IFPE)
  try {
    const env = getStpEnv();
    const client = createStpClient({
      empresa: env.empresa,
      apiKey: env.apiKey,
      baseUrl: getStpBaseUrl(env.environment),
      clabe: env.clabe,
    });
    const handler = createStpPaymentHandler({
      client,
      webhookSecret: env.webhookSecret,
      empresa: env.empresa,
      clabe: env.clabe,
    });
    registerPaymentHandler("stp", handler);
  } catch {
    // Env not configured, skip STP registration.
  }
}
