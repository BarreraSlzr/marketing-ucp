import { ProductCreateClient } from "@/app/products/create/product-create-client";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import styles from "../../../products/create/page.module.css";

export const metadata: Metadata = {
  title: "Create Product - UCP",
  description:
    "Create a product listing with UCP entities. Generate checkout links and shareable URLs instantly.",
};

export default function ProductCreatePage() {
  const t = useTranslations("product");

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
          <LocaleSwitcher />
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>{t("title")}</h1>
          <p className={styles.description}>{t("description")}</p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ProductCreateClient />
        </Suspense>
      </div>
    </main>
  );
}
