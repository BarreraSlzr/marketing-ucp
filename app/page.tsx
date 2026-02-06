import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ShoppingCart,
  CreditCard,
  Globe,
  Zap,
  Link2,
  Shield,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "UCP - Universal Checkout Protocol",
  description:
    "Unify your checkout experience across services. Stateless, URL-driven, and ready to integrate with Shopify, Polar, and more.",
};

const FEATURES = [
  {
    icon: Globe,
    title: "Stateless & URL-Driven",
    description:
      "Every checkout state lives in the URL. No sessions, no cookies, no database required. Share, bookmark, or resume any checkout.",
  },
  {
    icon: Zap,
    title: "Zod-Validated Pipelines",
    description:
      "Each form section is independently validated with Zod schemas. Type-safe from URL params through server actions.",
  },
  {
    icon: Shield,
    title: "Progressive Enhancement",
    description:
      "Forms work without JavaScript via native FormData and server actions. Progressive enhancement with nuqs for real-time URL sync.",
  },
  {
    icon: Link2,
    title: "Service Delegation",
    description:
      "Delegate payment to Polar, fulfillment to Shopify, or any provider. UCP is the glue between your checkout and external services.",
  },
  {
    icon: CreditCard,
    title: "Multi-Payment Support",
    description:
      "Token-based or card-based credentials via a discriminated union schema. Extensible to any payment handler.",
  },
  {
    icon: ShoppingCart,
    title: "Composable Forms",
    description:
      "Each form section uses formId to wire inputs anywhere in the DOM. Sections submit independently or together as a full checkout.",
  },
];

const INTEGRATIONS = [
  {
    code: "SH",
    name: "Shopify Storefront",
    description:
      "Sync products, manage inventory, and fulfill orders through the Shopify Storefront API.",
    status: "Planned",
  },
  {
    code: "PO",
    name: "Polar Payments",
    description:
      "Accept payments and manage subscriptions with Polar. Delegate payment processing seamlessly.",
    status: "Planned",
  },
  {
    code: "CMS",
    name: "Content Publishing",
    description:
      "Create SEO-optimized product pages. Publish content that ranks and converts.",
    status: "Coming soon",
  },
  {
    code: "FX",
    name: "EffectTS Logic Layer",
    description:
      "Typed, composable server-side business logic with EffectTS. Governs validation, enrichment, and processing pipelines.",
    status: "Coming soon",
  },
];

const STATS = [
  { value: "0", label: "Server-side sessions" },
  { value: "6", label: "Entity schemas" },
  { value: "100%", label: "URL-serializable" },
  { value: "Type-safe", label: "End to end" },
];

export default function HomePage() {
  return (
    <main className={styles.main}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>UCP</span>
            <span className={styles.navBadge}>Protocol</span>
          </div>
          <div className={styles.navLinks}>
            <Link href="/checkout" className={styles.navLink}>
              Checkout Demo
            </Link>
            <a
              href="https://github.com/BarreraSlzr/marketing-ucp"
              className={styles.navLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <Link href="/checkout" className={styles.navCta}>
              Try It
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroLabel}>
          Universal Checkout Protocol
        </span>
        <h1 className={styles.heroTitle}>
          One checkout protocol for every service
        </h1>
        <p className={styles.heroDescription}>
          Unify checkout across Shopify, Polar, and custom providers. Stateless
          forms driven entirely by URL parameters -- no sessions, no database,
          fully shareable and resumable.
        </p>
        <div className={styles.heroActions}>
          <Link href="/checkout" className={styles.heroPrimary}>
            Try the Checkout Demo
            <ArrowRight className="ml-2 inline-block h-4 w-4" />
          </Link>
          <a
            href="https://github.com/BarreraSlzr/marketing-ucp"
            className={styles.heroSecondary}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <p className={styles.featuresLabel}>How it works</p>
          <h2 className={styles.featuresTitle}>
            Built for modern commerce
          </h2>
          <p className={styles.featuresDescription}>
            Every design decision serves stateless, type-safe checkout flows
            that integrate with any service.
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className={styles.integrations}>
        <div className={styles.integrationsInner}>
          <div className={styles.integrationsHeader}>
            <p className={styles.featuresLabel}>Integrations</p>
            <h2 className={styles.featuresTitle}>
              Connect your services
            </h2>
            <p className={styles.featuresDescription}>
              UCP delegates to specialized services. Plug in payment providers,
              storefronts, and content systems.
            </p>
          </div>
          <div className={styles.integrationsGrid}>
            {INTEGRATIONS.map((integration) => (
              <div key={integration.name} className={styles.integrationCard}>
                <div className={styles.integrationIcon}>
                  {integration.code}
                </div>
                <div className={styles.integrationContent}>
                  <h3 className={styles.integrationName}>
                    {integration.name}
                  </h3>
                  <p className={styles.integrationDescription}>
                    {integration.description}
                  </p>
                  <span className={styles.integrationStatus}>
                    {integration.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <h2 className={styles.ctaTitle}>Ready to unify your checkout?</h2>
        <p className={styles.ctaDescription}>
          Start with the live demo. Every field you fill becomes a URL
          parameter -- stateless, shareable, and ready for production.
        </p>
        <div className={styles.ctaActions}>
          <Link href="/checkout" className={styles.heroPrimary}>
            Open Checkout Demo
            <ArrowRight className="ml-2 inline-block h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            UCP -- Universal Checkout Protocol
          </span>
          <div className={styles.footerLinks}>
            <Link href="/checkout" className={styles.footerLink}>
              Demo
            </Link>
            <a
              href="https://github.com/BarreraSlzr/marketing-ucp"
              className={styles.footerLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
