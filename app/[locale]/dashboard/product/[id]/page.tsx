import { Link } from "@/i18n/navigation";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const { id } = await params;
  const productName = id.replace(/_/g, " ");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Product detail</p>
          <h1 className={styles.title}>{productName}</h1>
          <p className={styles.subtitle}>Unified checkout product snapshot</p>
        </div>
        <Link className={styles.ghostButton} href="/dashboard">
          Back to dashboard
        </Link>
      </header>

      <section className={styles.card}>
        <div className={styles.panelHeader}>
          <h2>Product overview</h2>
          <p className={styles.panelHint}>Minimal profile</p>
        </div>
        <div className={styles.grid}>
          <div className={styles.item}>
            <span className={styles.label}>Product name</span>
            <span className={styles.value}>{productName}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Product ID</span>
            <span className={styles.value}>{id}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>SKU</span>
            <span className={styles.value}>{id}</span>
          </div>
          <div className={styles.item}>
            <span className={styles.label}>Status</span>
            <span className={styles.value}>Active</span>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.panelHeader}>
          <h2>Notes</h2>
          <p className={styles.panelHint}>Attach more context later</p>
        </div>
        <p className={styles.bodyCopy}>
          This product page is a placeholder surface. Wire it to checkout
          payload metadata when product registry data is available.
        </p>
      </section>
    </div>
  );
}
