import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { ALL_TEMPLATES, templateToUrl } from "@repo/entities";
import {
  ArrowRight,
  CreditCard,
  Globe,
  Link2,
  Package,
  Shield,
  ShoppingCart,
  Zap,
} from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import styles from "../page.module.css";

export const metadata: Metadata = {
  title: "UCP - Universal Checkout Protocol",
  description:
    "Unify your checkout experience across services. Stateless, URL-driven, and ready to integrate with Shopify, Polar, and more.",
};

type FeatureItem = {
  title: string;
  description: string;
};

export default function HomePage() {
  const t = useTranslations();
  const featureItems = t.raw("features.items") as FeatureItem[];

  const features = [
    { icon: Globe, ...featureItems[0] },
    { icon: Zap, ...featureItems[1] },
    { icon: Shield, ...featureItems[2] },
    { icon: Link2, ...featureItems[3] },
    { icon: CreditCard, ...featureItems[4] },
    { icon: ShoppingCart, ...featureItems[5] },
  ];

  const integrations = [
    {
      code: "SH",
      name: "Shopify Storefront",
      description: t("integrations.items.shopify"),
      status: t("integrations.available"),
    },
    {
      code: "PO",
      name: "Polar Payments",
      description: t("integrations.items.polar"),
      status: t("integrations.available"),
    },
    {
      code: "CMS",
      name: "Content Publishing",
      description: t("integrations.items.cms"),
      status: t("integrations.comingSoon"),
    },
    {
      code: "FX",
      name: "EffectTS Logic Layer",
      description: t("integrations.items.effect"),
      status: t("integrations.comingSoon"),
    },
  ];

  const stats = [
    { value: "0", label: t("stats.serverSessions") },
    { value: "6", label: t("stats.entitySchemas") },
    { value: "100%", label: t("stats.urlSerializable") },
    { value: "Type-safe", label: t("stats.endToEnd") },
  ];

  return (
    <main className={styles.main}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>UCP</span>
            <span className={styles.navBadge}>{t("nav.protocolBadge")}</span>
          </div>
          <div className={styles.navLinks}>
            <div className={styles.navControls}>
              <Link href="/checkout" className={styles.navLink}>
                {t("nav.checkoutDemo")}
              </Link>
              <Link href="/products/create" className={styles.navLink}>
                {t("nav.createProduct")}
              </Link>
              <a
                href="https://github.com/BarreraSlzr/marketing-ucp"
                className={styles.navLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("nav.github")}
              </a>
            </div>
            <div className={styles.navControls}>
              <LocaleSwitcher />
              <Link href="/checkout" className={styles.navCta}>
                {t("nav.tryIt")}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <span className={styles.heroLabel}>{t("hero.label")}</span>
        <h1 className={styles.heroTitle}>{t("hero.title")}</h1>
        <p className={styles.heroDescription}>{t("hero.description")}</p>
        <div className={styles.heroActions}>
          <Link href="/checkout" className={styles.heroPrimary}>
            {t("hero.primaryCta")}
            <ArrowRight className="ml-2 inline-block h-4 w-4" />
          </Link>
          <a
            href="https://github.com/BarreraSlzr/marketing-ucp"
            className={styles.heroSecondary}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("hero.secondaryCta")}
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Launch Templates */}
      <section className={styles.templates}>
        <div className={styles.templatesInner}>
          <div className={styles.featuresHeader}>
            <p className={styles.featuresLabel}>{t("templates.label")}</p>
            <h2 className={styles.featuresTitle}>{t("templates.title")}</h2>
            <p className={styles.featuresDescription}>
              {t("templates.description")}
            </p>
          </div>
          <div className={styles.templateCards}>
            {ALL_TEMPLATES.filter((item) => item.id !== "blank").map(
              (template) => (
                <Link
                  key={template.id}
                  href={templateToUrl(template)}
                  className={styles.templateCard}
                >
                  <div className={styles.templateCardTop}>
                    <span className={styles.templateCardName}>
                      {template.name}
                    </span>
                    <span className={styles.templateBadge}>
                      {template.category}
                    </span>
                  </div>
                  <p className={styles.templateCardDesc}>
                    {template.description}
                  </p>
                  <span className={styles.templateCardLink}>
                    {t("templates.launch")}
                    <ArrowRight className="ml-1 inline-block h-3 w-3" />
                  </span>
                </Link>
              ),
            )}
          </div>
          <div className={styles.templateActions}>
            <Link href="/checkout" className={styles.heroSecondary}>
              {t("templates.startBlank")}
            </Link>
            <Link href="/products/create" className={styles.heroSecondary}>
              <Package className="mr-2 inline-block h-4 w-4" />
              {t("templates.createProduct")}
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresHeader}>
          <p className={styles.featuresLabel}>{t("features.label")}</p>
          <h2 className={styles.featuresTitle}>{t("features.title")}</h2>
          <p className={styles.featuresDescription}>
            {t("features.description")}
          </p>
        </div>
        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className={styles.integrations}>
        <div className={styles.integrationsInner}>
          <div className={styles.integrationsHeader}>
            <p className={styles.featuresLabel}>{t("integrations.label")}</p>
            <h2 className={styles.featuresTitle}>{t("integrations.title")}</h2>
            <p className={styles.featuresDescription}>
              {t("integrations.description")}
            </p>
          </div>
          <div className={styles.integrationsGrid}>
            {integrations.map((integration) => (
              <div key={integration.name} className={styles.integrationCard}>
                <div className={styles.integrationIcon}>{integration.code}</div>
                <div className={styles.integrationContent}>
                  <h3 className={styles.integrationName}>{integration.name}</h3>
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
        <h2 className={styles.ctaTitle}>{t("cta.title")}</h2>
        <p className={styles.ctaDescription}>{t("cta.description")}</p>
        <div className={styles.ctaActions}>
          <Link href="/checkout" className={styles.heroPrimary}>
            {t("cta.button")}
            <ArrowRight className="ml-2 inline-block h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>
            UCP – Universal Checkout Protocol
          </span>
          <div className={styles.footerLinks}>
            <Link href="/checkout" className={styles.footerLink}>
              {t("footer.demo")}
            </Link>
            <Link href="/products/create" className={styles.footerLink}>
              {t("footer.products")}
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
