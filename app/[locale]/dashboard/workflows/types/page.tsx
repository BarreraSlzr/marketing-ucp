import { Link } from "@/i18n/navigation";
import { WORKFLOW_DEFINITIONS } from "@repo/workflows";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function WorkflowTypesPage() {
  // Group workflows by category
  const groupedWorkflows = WORKFLOW_DEFINITIONS.reduce(
    (acc, workflow) => {
      const category = workflow.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(workflow);
      return acc;
    },
    {} as Record<string, typeof WORKFLOW_DEFINITIONS>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Workflow Types</p>
          <h1 className={styles.title}>Browse by Category</h1>
          <p className={styles.subtitle}>
            Explore workflows organized by type and use case
          </p>
        </div>
        <Link className={styles.backLink} href="/dashboard/workflows">
          Back to workflows
        </Link>
      </header>

      <div className={styles.categories}>
        {Object.entries(groupedWorkflows)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, workflows]) => (
            <WorkflowTypeGroup
              key={category}
              category={category}
              workflows={workflows}
            />
          ))}
      </div>
    </div>
  );
}

interface WorkflowTypeGroupProps {
  category: string;
  workflows: typeof WORKFLOW_DEFINITIONS;
}

function WorkflowTypeGroup(props: WorkflowTypeGroupProps) {
  const { category, workflows } = props;

  const categoryColors: Record<string, string> = {
    checkout: "#635bff",
    subscription: "#10b981",
    payment: "#f59e0b",
    other: "#6b7280",
  };

  const color = categoryColors[category] || categoryColors.other;

  return (
    <section className={styles.typeSection}>
      <div className={styles.typeHeader}>
        <h2 className={styles.typeName} style={{ color }}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </h2>
        <span className={styles.typeCount}>
          {workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className={styles.workflowGrid}>
        {workflows.map((workflow) => (
          <Link
            key={workflow.id}
            href={`/dashboard/workflows/${workflow.id}`}
            className={styles.workflowCard}
          >
            <div className={styles.workflowCardContent}>
              <h3 className={styles.workflowName}>{workflow.name}</h3>
              <p className={styles.workflowDescription}>
                {workflow.description}
              </p>
              <div className={styles.workflowMeta}>
                <span className={styles.pill}>{workflow.id}</span>
                {workflow.pipeline_type && (
                  <span className={styles.pill}>{workflow.pipeline_type}</span>
                )}
                <span className={styles.pill}>
                  {workflow.steps.length} steps
                </span>
                <span className={styles.pill}>v{workflow.version}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
