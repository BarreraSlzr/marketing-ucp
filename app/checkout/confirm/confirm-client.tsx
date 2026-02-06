"use client";

import { useQueryStates } from "nuqs";
import { allParsers } from "@repo/entities";
import { Button, Separator } from "@repo/ui";
import { CheckCircle } from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export function ConfirmClient() {
  const [params] = useQueryStates(allParsers, { shallow: false });

  const details = [
    { label: "Email", value: params.buyer_email },
    { label: "Name", value: [params.buyer_first_name, params.buyer_last_name].filter(Boolean).join(" ") },
    { label: "Status", value: params.checkout_status },
    { label: "Currency", value: params.checkout_currency },
  ].filter((d) => d.value);

  return (
    <>
      <div className={styles.icon}>
        <CheckCircle className={styles.iconSvg} />
      </div>

      <h1 className={styles.heading}>Checkout Ready</h1>
      <p className={styles.description}>
        Your checkout session has been prepared. Review the details below.
      </p>

      {details.length > 0 && (
        <div className={styles.details}>
          {details.map((d, i) => (
            <div key={d.label}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>{d.label}</span>
                <span className={styles.detailValue}>{d.value}</span>
              </div>
              {i < details.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      )}

      <Button asChild variant="outline">
        <Link href="/">Back to Checkout</Link>
      </Button>
    </>
  );
}
