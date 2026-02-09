import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { getWorkflowById } from "../data";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function WorkflowDetailPage({
  params,
}: {
  params: { id: string };
}) {
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
      </div>

      <section className={styles.stepSection}>
        <h2 className={styles.sectionTitle}>Steps</h2>
        <div className={styles.stepList}>
          {workflow.steps.map((step, index) => (
            <div key={step.id} className={styles.stepCard}>
              <div className={styles.stepHeader}>
                <span className={styles.stepIndex}>{index + 1}</span>
                <div>
                  <p className={styles.stepName}>{step.label}</p>
                  <p className={styles.stepMeta}>
                    {step.kind}
                    {step.required ? " · required" : " · optional"}
                  </p>
                </div>
              </div>
              {step.description && (
                <p className={styles.stepDescription}>{step.description}</p>
              )}
              <div className={styles.stepChips}>
                {step.form_ids?.map((formId) => (
                  <span key={formId} className={styles.chip}>
                    form: {formId}
                  </span>
                ))}
                {step.action_ids?.map((actionId) => (
                  <span key={actionId} className={styles.chip}>
                    action: {actionId}
                  </span>
                ))}
                {step.endpoint && (
                  <span className={styles.chip}>
                    api: {step.endpoint.method} {step.endpoint.path}
                  </span>
                )}
                {step.pipeline_steps?.map((pipelineStep) => (
                  <span key={pipelineStep} className={styles.chip}>
                    pipeline: {pipelineStep}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
