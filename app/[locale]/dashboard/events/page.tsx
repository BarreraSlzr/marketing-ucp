import { EventStream } from "@/components/dashboard/event-stream";
import { getDashboardEvents } from "../data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardEventsPage() {
  const events = await getDashboardEvents();

  const steps = Array.from(new Set(events.map((event) => event.step))).sort();
  const statuses = Array.from(
    new Set(events.map((event) => event.status)),
  ).sort();
  const handlers = Array.from(
    new Set(events.map((event) => event.handler ?? "unattributed")),
  ).sort();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pipeline event log</p>
          <h1 className={styles.title}>Event Stream</h1>
          <p className={styles.subtitle}>
            Filter by pipeline, handler, and status to investigate failures
            fast.
          </p>
        </div>
      </header>

      <EventStream
        events={events}
        steps={steps}
        statuses={statuses}
        handlers={handlers}
      />
    </div>
  );
}
