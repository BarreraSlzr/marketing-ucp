import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getWorkflowById } from "../data";
import styles from "../page.module.css";
import { WorkflowDetailClient } from "./workflow-detail-client";

export const dynamic = "force-dynamic";

export default async function WorkflowDetailPage({
  params: paramPromise,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const params = await paramPromise;
  const workflow = await getWorkflowById({ workflowId: params.id });

  if (!workflow) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Workflow detail</p>
          <h1 className={styles.title}>{workflow.name}</h1>
          <p className={styles.subtitle}>{workflow.description}</p>
        </div>
        <Link className={styles.backLink} href="/dashboard/workflows">
          Back to workflows
        </Link>
      </header>

      <div className={styles.detailMeta}>
        <span className={styles.pill}>{workflow.id}</span>
        <span className={styles.pill}>{workflow.category}</span>
        {workflow.pipeline_type && (
          <span className={styles.pill}>{workflow.pipeline_type}</span>
        )}
        <span className={styles.pill}>v{workflow.version}</span>
        <Link
          className={styles.runLink}
          href={`/dashboard/workflows/run/${workflow.id}`}
        >
          ▶ Run Workflow
        </Link>
      </div>

      <WorkflowDetailClient workflow={workflow} />
    </div>
  );
}
