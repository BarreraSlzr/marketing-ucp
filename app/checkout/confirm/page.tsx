import { Suspense } from "react";
import { ConfirmClient } from "./confirm-client";
import styles from "./page.module.css";

export const metadata = {
  title: "Checkout Confirmed - UCP",
};

export default function ConfirmPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Suspense
          fallback={
            <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
          }
        >
          <ConfirmClient />
        </Suspense>
      </div>
    </main>
  );
}
