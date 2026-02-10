"use client";

import { Link } from "@/i18n/navigation";
import type { WorkflowDefinition } from "@repo/workflows";
import { Play, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ScopedEventStream } from "./components/scoped-event-stream";
import styles from "./workflow-stream.module.css";

// LEGEND: WorkflowStream component
// Unified workflow monitoring with registry templates and live event stream
// All usage must comply with this LEGEND and the LICENSE

interface WorkflowStreamProps {
  workflows: WorkflowDefinition[];
}

export function WorkflowStream(props: WorkflowStreamProps) {
  const { workflows } = props;
  const router = useRouter();

  const handlePlayDemo = (workflowId: string) => {
    router.push(`/dashboard/workflows/${workflowId}`);
  };

  return (
    <div className={styles.stream}>
      {/* Registry Templates Section */}
      <section className={styles.registrySection}>
        <div className={styles.registryHeader}>
          <div>
            <h2 className={styles.registryTitle}>
              <Wand2 className={styles.icon} />
              Workflow Registry
            </h2>
            <p className={styles.registrySubtitle}>
              Launch demo workflows with pre-filled templates
            </p>
          </div>
        </div>

        <div className={styles.workflowGrid}>
          {workflows.map((workflow) => (
            <div key={workflow.id} className={styles.workflowCard}>
              <div className={styles.workflowCardHeader}>
                <h3 className={styles.workflowName}>{workflow.name}</h3>
                <span className={styles.workflowCategory}>
                  {workflow.category}
                </span>
              </div>
              <p className={styles.workflowDescription}>
                {workflow.description}
              </p>
              <div className={styles.workflowMeta}>
                <span className={styles.metaPill}>{workflow.id}</span>
                <span className={styles.metaPill}>
                  {workflow.steps.length} steps
                </span>
                {workflow.pipeline_type && (
                  <span className={styles.metaPill}>
                    {workflow.pipeline_type}
                  </span>
                )}
              </div>
              <div className={styles.workflowActions}>
                <button
                  onClick={() => handlePlayDemo(workflow.id)}
                  className={styles.playButton}
                >
                  <Play className={styles.buttonIcon} />
                  Run Demo
                </button>
                <Link
                  href={`/dashboard/workflows/${workflow.id}`}
                  className={styles.viewButton}
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Event Stream with Filters */}
      <ScopedEventStream workflows={workflows} showWorkflowBadge />
    </div>
  );
}
