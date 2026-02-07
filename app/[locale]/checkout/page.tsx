import { CheckoutClient } from "@/components/checkout-client";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import styles from "../../checkout/page.module.css";

export const metadata: Metadata = {
  title: "Checkout - UCP",
  description: "Complete your purchase with the Universal Checkout Protocol.",
};

export default function CheckoutPage() {
  const t = useTranslations();

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>{t("checkout.title")}</h1>
            <span className={styles.badge}>{t("checkout.badge")}</span>
          </div>
          <LocaleSwitcher />
        </div>
      </header>

      <div className={styles.container}>
        <Suspense fallback={<CheckoutSkeleton />}>
          <CheckoutClient />
        </Suspense>
      </div>
    </main>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-48 animate-pulse rounded-lg border border-border bg-muted"
        />
      ))}
    </div>
  );
}
