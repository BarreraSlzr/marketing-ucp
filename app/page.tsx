import { Suspense } from "react";
import { CheckoutClient } from "@/components/checkout-client";
import styles from "./page.module.scss";

export default function CheckoutPage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>UCP Checkout</h1>
          <span className={styles.badge}>Stateless</span>
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
