import { ConfirmClient } from "@/app/checkout/confirm/confirm-client";
import { Suspense } from "react";
import styles from "../../../checkout/confirm/page.module.css";

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
