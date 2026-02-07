import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getAllDocs, getDocBySlug } from "@/lib/docs/docs";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import styles from "../docs.module.css";
import { Suspense } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const doc = getDocBySlug(params.slug);

  if (!doc) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: doc.title,
    description: doc.description || `Documentation: ${doc.title}`,
  };
}

export default async function DocPage(props: Props) {
  const params = await props.params;
  const doc = getDocBySlug(params.slug);

  if (!doc) {
    notFound();
  }

  return (
    <main className={styles.main}>
      <div className={styles.docContainer}>
        {/* Header */}
        <div className={styles.docHeader}>
          <Link href="/docs" className={styles.backLink}>
            <ArrowLeft className="inline-block mr-2 h-4 w-4" />
            Back to Documentation
          </Link>
          <h1 className={styles.docTitle}>{doc.title}</h1>
          {doc.description && (
            <p className={styles.description}>{doc.description}</p>
          )}
        </div>

        {/* Content */}
        <Suspense fallback={<div>Loading...</div>}>
          <article className={styles.docContent}>
            <MarkdownRenderer content={doc.content} />
          </article>
        </Suspense>

        {/* Actions */}
        <div className={styles.docActions}>
          <a
            href={`/api/docs/${params.slug}`}
            className={styles.docAction}
            download={doc.fileName}
          >
            <Download className="inline-block mr-2 h-4 w-4" />
            Download Markdown
          </a>
          <a
            href={`/api/docs/${params.slug}?format=raw`}
            className={styles.docAction}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="inline-block mr-2 h-4 w-4" />
            View Raw Markdown
          </a>
          <a
            href={`https://github.com/BarreraSlzr/marketing-ucp/blob/main/docs/${doc.fileName}`}
            className={styles.docAction}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="inline-block mr-2 h-4 w-4" />
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
}
