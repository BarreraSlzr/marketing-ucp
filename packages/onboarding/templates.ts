// LEGEND: Onboarding form templates for all IFPE adapters
// Each template defines the fields required to onboard a legal customer
// All usage must comply with this LEGEND and the LICENSE

import { registerOnboardingTemplate } from "./registry";
import type { OnboardingTemplate } from "./schemas";

/* ── Stripe ───────────────────────────────────────────────── */
export const ONBOARDING_STRIPE: OnboardingTemplate = {
  id: "stripe",
  name: "Stripe",
  description: "Credit/debit card processing via Stripe. Supports global payments.",
  category: "payment",
  regions: ["global"],
  docsUrl: "https://docs.stripe.com/keys",
  fields: [
    {
      key: "secretKey",
      label: "Secret Key",
      type: "password",
      placeholder: "sk_live_...",
      description: "Your Stripe secret API key (starts with sk_live_ or sk_test_)",
      required: true,
      group: "credentials",
      envVar: "STRIPE_SECRET_KEY",
      order: 0,
    },
    {
      key: "webhookSecret",
      label: "Webhook Signing Secret",
      type: "password",
      placeholder: "whsec_...",
      description: "Used to verify incoming Stripe webhook events",
      required: true,
      group: "credentials",
      envVar: "STRIPE_WEBHOOK_SECRET",
      order: 1,
    },
  ],
  version: "2026-02-08",
};

/* ── Polar ────────────────────────────────────────────────── */
export const ONBOARDING_POLAR: OnboardingTemplate = {
  id: "polar",
  name: "Polar",
  description: "Subscriptions and digital products for open source via Polar.",
  category: "payment",
  regions: ["global"],
  docsUrl: "https://docs.polar.sh",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      placeholder: "polar_...",
      description: "Your Polar API key",
      required: true,
      group: "credentials",
      envVar: "POLAR_API_KEY",
      order: 0,
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      placeholder: "whsec_...",
      description: "Verify incoming Polar webhook events",
      required: true,
      group: "credentials",
      envVar: "POLAR_WEBHOOK_SECRET",
      order: 1,
    },
    {
      key: "baseUrl",
      label: "Base URL",
      type: "url",
      placeholder: "https://api.polar.sh",
      description: "Custom Polar API base URL (optional, defaults to production)",
      required: false,
      defaultValue: "https://api.polar.sh",
      group: "advanced",
      envVar: "POLAR_BASE_URL",
      order: 2,
    },
  ],
  version: "2026-02-08",
};

/* ── PayPal MX ────────────────────────────────────────────── */
export const ONBOARDING_PAYPAL_MX: OnboardingTemplate = {
  id: "paypal-mx",
  name: "PayPal México",
  description:
    "PayPal integration optimized for Mexico. Supports sandbox and live environments.",
  category: "payment",
  regions: ["MX"],
  docsUrl: "https://developer.paypal.com/docs/api/overview/",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "text",
      placeholder: "AV3...",
      description: "PayPal REST API client ID",
      required: true,
      group: "credentials",
      envVar: "PAYPAL_MX_CLIENT_ID",
      order: 0,
    },
    {
      key: "clientSecret",
      label: "Client Secret",
      type: "password",
      placeholder: "EKj...",
      description: "PayPal REST API client secret",
      required: true,
      group: "credentials",
      envVar: "PAYPAL_MX_CLIENT_SECRET",
      order: 1,
    },
    {
      key: "webhookId",
      label: "Webhook ID",
      type: "text",
      placeholder: "WH-...",
      description: "PayPal webhook identifier for event verification",
      required: true,
      group: "credentials",
      envVar: "PAYPAL_MX_WEBHOOK_ID",
      order: 2,
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      description: "PayPal API environment",
      required: true,
      defaultValue: "sandbox",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Live", value: "live" },
      ],
      group: "configuration",
      envVar: "PAYPAL_MX_ENVIRONMENT",
      order: 3,
    },
  ],
  version: "2026-02-08",
};

/* ── MercadoPago ──────────────────────────────────────────── */
export const ONBOARDING_MERCADOPAGO: OnboardingTemplate = {
  id: "mercadopago",
  name: "MercadoPago",
  description:
    "MercadoPago integration for Latin America. Supports cards, OXXO, SPEI, and more.",
  category: "payment",
  regions: ["MX", "AR", "BR", "CO", "CL"],
  docsUrl: "https://www.mercadopago.com.mx/developers",
  fields: [
    {
      key: "accessToken",
      label: "Access Token",
      type: "password",
      placeholder: "APP_USR-...",
      description: "MercadoPago access token",
      required: true,
      group: "credentials",
      envVar: "MERCADOPAGO_ACCESS_TOKEN",
      order: 0,
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      description: "Used to verify MercadoPago IPN/webhook notifications",
      required: true,
      group: "credentials",
      envVar: "MERCADOPAGO_WEBHOOK_SECRET",
      order: 1,
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      description: "API environment",
      required: true,
      defaultValue: "sandbox",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Production", value: "production" },
      ],
      group: "configuration",
      envVar: "MERCADOPAGO_ENVIRONMENT",
      order: 2,
    },
  ],
  version: "2026-02-08",
};

/* ── Compropago ───────────────────────────────────────────── */
export const ONBOARDING_COMPROPAGO: OnboardingTemplate = {
  id: "compropago",
  name: "ComproPago",
  description:
    "Cash payment networks in Mexico (OXXO, 7-Eleven, convenience stores).",
  category: "cash_payment",
  regions: ["MX"],
  docsUrl: "https://compropago.com/documentacion",
  fields: [
    {
      key: "apiKey",
      label: "API Key (Private)",
      type: "password",
      description: "ComproPago private API key",
      required: true,
      group: "credentials",
      envVar: "COMPROPAGO_API_KEY",
      order: 0,
    },
    {
      key: "publicKey",
      label: "Public Key",
      type: "text",
      description: "ComproPago public key for client-side integration",
      required: true,
      group: "credentials",
      envVar: "COMPROPAGO_PUBLIC_KEY",
      order: 1,
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      description: "Verify event authenticity",
      required: true,
      group: "credentials",
      envVar: "COMPROPAGO_WEBHOOK_SECRET",
      order: 2,
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      description: "API environment",
      required: true,
      defaultValue: "sandbox",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Live", value: "live" },
      ],
      group: "configuration",
      envVar: "COMPROPAGO_ENVIRONMENT",
      order: 3,
    },
  ],
  version: "2026-02-08",
};

/* ── STP (Sistema de Transferencias y Pagos) ──────────────── */
export const ONBOARDING_STP: OnboardingTemplate = {
  id: "stp",
  name: "STP",
  description:
    "Mexican bank transfer network (SPEI). Direct interbank transfers for legal entities.",
  category: "bank_transfer",
  regions: ["MX"],
  docsUrl: "https://stpmex.com",
  fields: [
    {
      key: "empresa",
      label: "Empresa (Company Alias)",
      type: "text",
      placeholder: "MI_EMPRESA",
      description: "Your STP empresa/company alias as registered in STP",
      required: true,
      group: "credentials",
      envVar: "STP_EMPRESA",
      order: 0,
    },
    {
      key: "apiKey",
      label: "API Key / Signing Key",
      type: "password",
      description: "Private key or API key for signing STP requests",
      required: true,
      group: "credentials",
      envVar: "STP_API_KEY",
      order: 1,
    },
    {
      key: "clabe",
      label: "CLABE",
      type: "text",
      placeholder: "646180...",
      description: "18-digit CLABE account registered in STP",
      required: true,
      pattern: "^\\d{18}$",
      patternMessage: "CLABE must be exactly 18 digits",
      group: "credentials",
      envVar: "STP_CLABE",
      order: 2,
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      description: "Verify STP webhook event signatures",
      required: true,
      group: "credentials",
      envVar: "STP_WEBHOOK_SECRET",
      order: 3,
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      description: "STP API environment",
      required: true,
      defaultValue: "sandbox",
      options: [
        { label: "Sandbox", value: "sandbox" },
        { label: "Production", value: "production" },
      ],
      group: "configuration",
      envVar: "STP_ENVIRONMENT",
      order: 4,
    },
  ],
  version: "2026-02-08",
};

/* ── Thirdweb (Web3) ──────────────────────────────────────── */
export const ONBOARDING_THIRDWEB: OnboardingTemplate = {
  id: "thirdweb",
  name: "Thirdweb",
  description: "Web3 crypto payments via Thirdweb SDK. Multi-chain support.",
  category: "web3",
  regions: ["global"],
  docsUrl: "https://portal.thirdweb.com",
  fields: [
    {
      key: "secretKey",
      label: "Secret Key",
      type: "password",
      description: "Thirdweb API secret key",
      required: true,
      group: "credentials",
      envVar: "THIRDWEB_SECRET_KEY",
      order: 0,
    },
    {
      key: "webhookSecret",
      label: "Webhook Secret",
      type: "password",
      description: "Verify Thirdweb webhook events",
      required: true,
      group: "credentials",
      envVar: "THIRDWEB_WEBHOOK_SECRET",
      order: 1,
    },
    {
      key: "defaultChainId",
      label: "Default Chain ID",
      type: "text",
      placeholder: "1",
      description: "Default blockchain chain ID (e.g. 1 for Ethereum mainnet, 137 for Polygon)",
      required: true,
      defaultValue: "1",
      group: "configuration",
      envVar: "THIRDWEB_CHAIN_ID",
      order: 2,
    },
  ],
  version: "2026-02-08",
};

/* ── Shopify (Storefront) ─────────────────────────────────── */
export const ONBOARDING_SHOPIFY: OnboardingTemplate = {
  id: "shopify",
  name: "Shopify Storefront",
  description:
    "Shopify Storefront API integration for product syncing and cart management.",
  category: "storefront",
  regions: ["global"],
  docsUrl: "https://shopify.dev/docs/api/storefront",
  fields: [
    {
      key: "storeDomain",
      label: "Store Domain",
      type: "text",
      placeholder: "your-store.myshopify.com",
      description: "Your Shopify store domain",
      required: true,
      pattern: "^[a-z0-9-]+\\.myshopify\\.com$",
      patternMessage: "Must be a valid myshopify.com domain",
      group: "credentials",
      envVar: "SHOPIFY_STORE_DOMAIN",
      order: 0,
    },
    {
      key: "storefrontToken",
      label: "Storefront Access Token",
      type: "password",
      description: "Shopify Storefront API access token",
      required: true,
      group: "credentials",
      envVar: "SHOPIFY_STOREFRONT_TOKEN",
      order: 1,
    },
    {
      key: "apiVersion",
      label: "API Version",
      type: "text",
      placeholder: "2024-10",
      description: "Shopify API version (optional, defaults to latest stable)",
      required: false,
      defaultValue: "2024-10",
      group: "advanced",
      envVar: "SHOPIFY_API_VERSION",
      order: 2,
    },
  ],
  version: "2026-02-08",
};

/* ── All Templates ────────────────────────────────────────── */
export const ALL_ONBOARDING_TEMPLATES: OnboardingTemplate[] = [
  ONBOARDING_STRIPE,
  ONBOARDING_POLAR,
  ONBOARDING_PAYPAL_MX,
  ONBOARDING_MERCADOPAGO,
  ONBOARDING_COMPROPAGO,
  ONBOARDING_STP,
  ONBOARDING_THIRDWEB,
  ONBOARDING_SHOPIFY,
];

/* ── Auto-Register ────────────────────────────────────────── */
for (const template of ALL_ONBOARDING_TEMPLATES) {
  registerOnboardingTemplate({ template });
}
