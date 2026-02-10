import { WorkflowEventStream } from "@/components/pipeline/workflow-event-stream";
import { Link } from "@/i18n/navigation";
import { ALL_TEMPLATES } from "@repo/entities/templates";
import { notFound } from "next/navigation";
import { getWorkflowById } from "../data";
import styles from "../page.module.css";
import { WorkflowRunnerClient } from "./workflow-runner-client";

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

  // Pick the best template for pre-filling mock data
  const templateMap: Record<string, string> = {
    checkout_baseline: "flower-shop",
    checkout_digital: "digital-product",
    checkout_subscription: "polar-sub",
  };
  const templateId = templateMap[workflow.id] ?? "flower-shop";
  const template =
    ALL_TEMPLATES.find((t) => t.id === templateId) ?? ALL_TEMPLATES[0];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Workflow Runner</p>
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
      </div>

      <WorkflowRunnerClient
        workflow={workflow}
        templateParams={template.params as Record<string, unknown>}
      />

      <section className={styles.eventStreamSection}>
        <WorkflowEventStream workflowId={workflow.id} />
      </section>
    </div>
  );
}
