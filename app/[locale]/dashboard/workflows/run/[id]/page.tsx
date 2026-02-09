import { Link } from "@/i18n/navigation";
import { ALL_TEMPLATES } from "@repo/entities/templates";
import { notFound } from "next/navigation";
import { getWorkflowById } from "../../data";
import styles from "../../page.module.css";
import { WorkflowRunnerClient } from "./workflow-runner-client";

export const dynamic = "force-dynamic";

export default async function WorkflowRunPage({
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
        <Link
          className={styles.backLink}
          href={`/dashboard/workflows/${workflow.id}`}
        >
          Back to detail
        </Link>
      </header>

      <WorkflowRunnerClient
        workflow={workflow}
        templateParams={template.params as Record<string, unknown>}
      />
    </div>
  );
}
