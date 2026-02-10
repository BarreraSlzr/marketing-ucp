import { Link } from "@/i18n/navigation";
import { getWorkflowDefinitions } from "./data";
import styles from "./page.module.css";
import { WorkflowListClient } from "./workflow-list";
import { WorkflowsEventStream } from "./workflows-event-stream";
import { WorkflowsFilters } from "./workflows-filters";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const workflows = await getWorkflowDefinitions();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Registry</p>
          <h1 className={styles.title}>Workflow Definitions</h1>
          <p className={styles.subtitle}>
            Canonical checkout and payment workflows powering UCP flows.
          </p>
        </div>
        <Link className={styles.backLink} href="/dashboard">
          Back to dashboard
        </Link>
      </header>

      <WorkflowListClient workflows={workflows} />

      <section className={styles.monitoringSection}>
        <h2 className={styles.sectionTitle}>Live Workflow Monitoring</h2>
        <p className={styles.sectionSubtitle}>
          Real-time event stream across all workflows with filtering
        </p>
        <WorkflowsFilters />
        <WorkflowsEventStream />
      </section>
    </div>
  );
}
