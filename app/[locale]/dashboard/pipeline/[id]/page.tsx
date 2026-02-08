import { generateDemoPipelineEvents } from "@/lib/pipeline-demo";
import { getPipelineDefinition } from "@repo/pipeline";
import { getDashboardSessionById } from "../../data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatTimestamp(params: { timestamp?: string | null }): string {
  if (!params.timestamp) {
    return "--";
  }
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return "--";
  }
  return dateFormatter.format(ms);
}

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

  const definition = getPipelineDefinition({ type: session.pipeline_type });
  const knownSteps = definition
    ? [...definition.required_steps, ...definition.optional_steps]
    : Array.from(new Set(session.events.map((event) => event.step)));

  const steps = knownSteps.map((step) => {
    const stepEvents = session.events.filter((event) => event.step === step);
    const latest = stepEvents.sort(
      (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
    )[0];

    return {
      step,
      status: latest?.status ?? "pending",
      duration: latest?.duration_ms ?? null,
      lastSeen: latest?.timestamp ?? null,
    };
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pipeline detail</p>
          <h1 className={styles.title}>{session.session_id}</h1>
          <p className={styles.subtitle}>{session.pipeline_type}</p>
        </div>
        <button className={styles.ghostButton} disabled>
          Replay pipeline
        </button>
      </header>

      <section className={styles.timelineCard}>
        <div className={styles.panelHeader}>
          <h2>Step timeline</h2>
          <p className={styles.panelHint}>Latest event per step</p>
        </div>
        <div className={styles.timeline}>
          {steps.map((step, index) => (
            <div key={step.step} className={styles.timelineStep}>
              <div className={styles.stepTop}>
                <div
                  className={`${styles.stepDot} ${styles[step.status] ?? ""}`}
                >
                  {step.status === "success"
                    ? "OK"
                    : step.status === "failure"
                      ? "ERR"
                      : step.status === "skipped"
                        ? "SKIP"
                        : "WAIT"}
                </div>
                {index < steps.length - 1 && (
                  <div className={styles.stepLine} />
                )}
              </div>
              <div className={styles.stepBody}>
                <p className={styles.stepName}>{step.step}</p>
                <p className={styles.stepMeta}>
                  {step.duration !== null ? `${step.duration}ms` : "--"} ·{" "}
                  {formatTimestamp({ timestamp: step.lastSeen })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.checksumCard}>
          <div className={styles.panelHeader}>
            <h2>Checksum verification</h2>
            <p className={styles.panelHint}>Chain hash integrity</p>
          </div>
          {session.checksum ? (
            <div className={styles.checksumBody}>
              <div className={styles.checksumRow}>
                <span>Status</span>
                <span
                  className={`${styles.statusBadge} ${
                    session.checksum.is_valid ? styles.success : styles.failure
                  }`}
                >
                  {session.checksum.is_valid ? "Valid" : "Invalid"}
                </span>
              </div>
              <div className={styles.checksumRow}>
                <span>Steps completed</span>
                <span>
                  {session.checksum.steps_completed} /{" "}
                  {session.checksum.steps_expected}
                </span>
              </div>
              <div className={styles.checksumRow}>
                <span>Failed steps</span>
                <span>{session.checksum.steps_failed}</span>
              </div>
              <div className={styles.checksumHash}>
                <span>Chain hash</span>
                <code>{session.checksum.chain_hash}</code>
              </div>
            </div>
          ) : (
            <p className={styles.emptyState}>Checksum not available.</p>
          )}
        </div>

        <div className={styles.eventsCard}>
          <div className={styles.panelHeader}>
            <h2>Raw events</h2>
            <p className={styles.panelHint}>{session.events.length} events</p>
          </div>
          <div className={styles.rawEvents}>
            {session.events.map((event) => (
              <details key={event.id} className={styles.eventItem}>
                <summary className={styles.eventSummary}>
                  <span>{event.step}</span>
                  <span className={styles.eventStatus}>{event.status}</span>
                  <span className={styles.eventTime}>
                    {formatTimestamp({ timestamp: event.timestamp })}
                  </span>
                </summary>
                <pre>{JSON.stringify(event, null, 2)}</pre>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
