import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCreateClient } from "./product-create-client";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Create Product - UCP",
  description:
    "Create a product listing with UCP entities. Generate checkout links and shareable URLs instantly.",
};

export default function ProductCreatePage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Create Product</h1>
          <p className={styles.description}>
            Fill in product details using the form below. Every field syncs to
            URL parameters -- share the URL to let others edit, or generate a
            checkout link to test the full purchase flow.
          </p>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ProductCreateClient />
        </Suspense>
      </div>
    </main>
  );
}
