import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  ExternalLink,
  FileText,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ComponentType } from "react";
import styles from "./page.module.css";

type DocCard = {
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
  icon: ComponentType<{ className?: string }>;
};

export default function DocsPage() {
  const t = useTranslations();

  const startCards: DocCard[] = [
    {
      title: t("docs.start.checkout.title"),
      description: t("docs.start.checkout.description"),
      cta: t("docs.start.checkout.cta"),
      href: "/checkout",
      icon: LayoutGrid,
    },
    {
      title: t("docs.start.dashboard.title"),
      description: t("docs.start.dashboard.description"),
      cta: t("docs.start.dashboard.cta"),
      href: "/dashboard",
      icon: ShieldCheck,
    },
    {
      title: t("docs.start.onboarding.title"),
      description: t("docs.start.onboarding.description"),
      cta: t("docs.start.onboarding.cta"),
      href: "/onboarding",
      icon: FileText,
    },
  ];

  const guideCards: DocCard[] = [
    {
      title: t("docs.guides.architecture.title"),
      description: t("docs.guides.architecture.description"),
      cta: t("docs.guides.architecture.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/architecture.md",
      external: true,
      icon: FileText,
    },
    {
      title: t("docs.guides.workflows.title"),
      description: t("docs.guides.workflows.description"),
      cta: t("docs.guides.workflows.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/workflows.md",
      external: true,
      icon: LayoutGrid,
    },
    {
      title: t("docs.guides.pipeline.title"),
      description: t("docs.guides.pipeline.description"),
      cta: t("docs.guides.pipeline.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/pipeline-tracking.md",
      external: true,
      icon: FileText,
    },
    {
      title: t("docs.guides.webhooks.title"),
      description: t("docs.guides.webhooks.description"),
      cta: t("docs.guides.webhooks.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/webhook-api-integration-forms.md",
      external: true,
      icon: ShieldCheck,
    },
    {
      title: t("docs.guides.payments.title"),
      description: t("docs.guides.payments.description"),
      cta: t("docs.guides.payments.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/payment-handlers.md",
      external: true,
      icon: ShieldCheck,
    },
  ];

  const activeCards: DocCard[] = [
    {
      title: t("docs.active.definitions.title"),
      description: t("docs.active.definitions.description"),
      cta: t("docs.active.definitions.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/issues/33",
      external: true,
      icon: LayoutGrid,
    },
    {
      title: t("docs.active.stream.title"),
      description: t("docs.active.stream.description"),
      cta: t("docs.active.stream.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/issues/35",
      external: true,
      icon: ShieldCheck,
    },
    {
      title: t("docs.active.runner.title"),
      description: t("docs.active.runner.description"),
      cta: t("docs.active.runner.cta"),
      href: "https://github.com/BarreraSlzr/marketing-ucp/issues/34",
      external: true,
      icon: FileText,
    },
  ];

  const renderCard = (card: DocCard) => {
    const Icon = card.icon;
    const content = (
      <>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <Icon className="h-4 w-4" />
          </div>
          <span className={styles.cardTitle}>{card.title}</span>
        </div>
        <p className={styles.cardDescription}>{card.description}</p>
        <span className={styles.cardCta}>
          {card.cta}
          {card.external ? (
            <ExternalLink className="ml-2 inline-block h-3 w-3" />
          ) : (
            <ArrowRight className="ml-2 inline-block h-3 w-3" />
          )}
        </span>
      </>
    );

    if (card.external) {
      return (
        <a
          key={card.title}
          href={card.href}
          className={styles.card}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }

    return (
      <Link key={card.title} href={card.href} className={styles.card}>
        {content}
      </Link>
    );
  };

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <p className={styles.kicker}>{t("docs.kicker")}</p>
        <h1 className={styles.title}>{t("docs.title")}</h1>
        <p className={styles.description}>{t("docs.description")}</p>
        <div className={styles.heroActions}>
          <a
            href="https://github.com/BarreraSlzr/marketing-ucp/tree/main/docs"
            className={styles.primary}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("docs.primaryCta")}
            <ExternalLink className="ml-2 inline-block h-4 w-4" />
          </a>
          <Link href="/checkout" className={styles.secondary}>
            {t("docs.secondaryCta")}
            <ArrowRight className="ml-2 inline-block h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {t("docs.sections.start.title")}
          </h2>
          <p className={styles.sectionDescription}>
            {t("docs.sections.start.description")}
          </p>
        </div>
        <div className={styles.cardGrid}>{startCards.map(renderCard)}</div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {t("docs.sections.guides.title")}
          </h2>
          <p className={styles.sectionDescription}>
            {t("docs.sections.guides.description")}
          </p>
        </div>
        <div className={styles.cardGrid}>{guideCards.map(renderCard)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {t("docs.sections.active.title")}
          </h2>
          <p className={styles.sectionDescription}>
            {t("docs.sections.active.description")}
          </p>
        </div>
        <div className={styles.cardGrid}>{activeCards.map(renderCard)}</div>
      </section>
    </main>
  );
}
