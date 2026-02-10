import { Link } from "@/i18n/navigation";
import { getWorkflowDefinitions } from "./data";
import styles from "./page.module.css";
import { WorkflowStream } from "./workflow-stream";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const workflows = await getWorkflowDefinitions();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Workflow Registry</p>
          <h1 className={styles.title}>Workflow Orchestration</h1>
          <p className={styles.subtitle}>
            Launch demo workflows, monitor live events, and explore canonical checkout patterns.
          </p>
        </div>
        <Link className={styles.backLink} href="/dashboard">
          Back to dashboard
        </Link>
      </header>

      <WorkflowStream workflows={workflows} />
    </div>
  );
}
