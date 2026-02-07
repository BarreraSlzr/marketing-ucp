"use client";

import { Link } from "@/i18n/navigation";
import { allParsers } from "@repo/entities";
import { Button, Separator } from "@repo/ui";
import { CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import styles from "./page.module.css";

export function ConfirmClient() {
  const [params] = useQueryStates(allParsers, { shallow: false });
  const t = useTranslations("confirm");

  const details = [
    { label: t("email"), value: params.buyer_email },
    {
      label: t("name"),
      value: [params.buyer_first_name, params.buyer_last_name]
        .filter(Boolean)
        .join(" "),
    },
    { label: t("status"), value: params.checkout_status },
    { label: t("currency"), value: params.checkout_currency },
  ].filter((d) => d.value);

  return (
    <>
      <div className={styles.icon}>
        <CheckCircle className={styles.iconSvg} />
      </div>

      <h1 className={styles.heading}>{t("heading")}</h1>
      <p className={styles.description}>{t("description")}</p>

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
        <Link href="/checkout">{t("back")}</Link>
      </Button>
    </>
  );
}
