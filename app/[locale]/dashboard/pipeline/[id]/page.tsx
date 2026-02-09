import { generateDemoPipelineEvents } from "@/lib/pipeline-demo";
import { getDashboardSessionById } from "../../data";
import styles from "./page.module.css";
import { PipelineDetailClient } from "./pipeline-detail-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PipelineDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale?: string }>;
}) {
  const { id } = await params;
  let session = null as Awaited<ReturnType<typeof getDashboardSessionById>>;
  let loadError: string | null = null;

  try {
    session = await getDashboardSessionById({ sessionId: id });
    if (!session && id.startsWith("demo_")) {
      await generateDemoPipelineEvents();
      session = await getDashboardSessionById({ sessionId: id });
    }
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load pipeline";
  }

  if (!session) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Pipeline detail</p>
            <h1 className={styles.title}>{id}</h1>
            <p className={styles.subtitle}>Pipeline data not available yet.</p>
          </div>
          <button className={styles.ghostButton} disabled>
            Replay pipeline
          </button>
        </header>

        <section className={styles.timelineCard}>
          <div className={styles.panelHeader}>
            <h2>Step timeline</h2>
            <p className={styles.panelHint}>Awaiting demo events</p>
          </div>
          <p className={styles.emptyState}>
            {loadError ??
              "No pipeline events were recorded for this session yet."}
          </p>
        </section>
      </div>
    );
  }

  return <PipelineDetailClient initialSession={session} />;
}
