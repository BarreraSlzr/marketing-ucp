import { Link } from "@/i18n/navigation";
import { getAllDocs } from "@/lib/docs/docs";
import { BookOpen, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import styles from "./docs.module.css";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Technical documentation, architecture guides, and implementation details for the Universal Checkout Protocol.",
};

export default function DocsIndexPage() {
  const docs = getAllDocs();

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Home
          </Link>
          <div className={styles.titleGroup}>
            <BookOpen className={styles.icon} />
            <h1 className={styles.title}>Documentation</h1>
          </div>
          <p className={styles.description}>
            Technical guides, architecture decisions, and implementation details
            for the Universal Checkout Protocol.
          </p>
        </div>

        {/* Documentation Grid */}
        <div className={styles.grid}>
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className={styles.card}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>{doc.title}</h2>
                <ArrowRight className={styles.cardIcon} />
              </div>
              {doc.description && (
                <p className={styles.cardDescription}>{doc.description}</p>
              )}
              <span className={styles.cardLink}>
                Read documentation →
              </span>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className={styles.quickLinks}>
          <h2 className={styles.quickLinksTitle}>Quick Links</h2>
          <div className={styles.quickLinksGrid}>
            <a
              href="https://github.com/BarreraSlzr/marketing-ucp"
              className={styles.quickLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub Repository →
            </a>
            <Link href="/checkout" className={styles.quickLink}>
              Try Checkout Demo →
            </Link>
            <Link href="/products/create" className={styles.quickLink}>
              Create Product →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
