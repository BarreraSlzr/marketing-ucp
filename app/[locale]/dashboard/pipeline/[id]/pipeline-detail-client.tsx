"use client";

import { Link } from "@/i18n/navigation";
import {
  fetchDashboardSessions,
  sessionsEndpoint,
  type DashboardPipelineEvent,
  type DashboardSessionsResponse,
  type PipelineSessionSummary,
} from "@/lib/dashboard-sessions";
import { getPipelineDefinition } from "@repo/pipeline";
import { useMemo } from "react";
import useSWR from "swr";
import styles from "./page.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const defaultPollIntervalMs = 10_000;

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

function extractProductDetails(params: {
  events: DashboardPipelineEvent[];
  fallbackName: string;
  fallbackSku: string;
}): {
  name: string;
  sku: string;
  productId: string;
  quantity: string;
  price: string;
} {
  let name: string | null = null;
  let sku: string | null = null;
  let productId: string | null = null;
  let quantity: string | null = null;
  let price: string | null = null;

  for (const event of params.events) {
    const metadata = event.metadata;
    if (!metadata || typeof metadata !== "object") {
      continue;
    }

    const record = metadata as Record<string, unknown>;
    name =
      name ??
      (typeof record.product_name === "string"
        ? record.product_name
        : typeof record.title === "string"
          ? record.title
          : typeof record.name === "string"
            ? record.name
            : null);

    sku =
      sku ??
      (typeof record.sku === "string"
        ? record.sku
        : typeof record.product_id === "string"
          ? record.product_id
          : null);

    productId =
      productId ??
      (typeof record.product_id === "string"
        ? record.product_id
        : typeof record.sku === "string"
          ? record.sku
          : null);

    if (quantity === null) {
      const qtyValue =
        typeof record.quantity === "number"
          ? record.quantity
          : typeof record.qty === "number"
            ? record.qty
            : null;
      if (qtyValue !== null) {
        quantity = `${qtyValue}`;
      }
    }

    if (price === null) {
      const amount =
        typeof record.price === "number"
          ? record.price
          : typeof record.amount === "number"
            ? record.amount
            : null;
      const currency =
        typeof record.currency === "string" ? record.currency : null;
      if (amount !== null) {
        price = currency ? `${currency} ${amount}` : `${amount}`;
      }
    }
  }

  return {
    name: name ?? params.fallbackName,
    sku: sku ?? params.fallbackSku,
    productId: productId ?? sku ?? params.fallbackSku,
    quantity: quantity ?? "--",
    price: price ?? "--",
  };
}

export function PipelineDetailClient(params: {
  initialSession: PipelineSessionSummary;
  pollIntervalMs?: number;
}) {
  const pollIntervalMs = params.pollIntervalMs ?? defaultPollIntervalMs;
  const { data } = useSWR<DashboardSessionsResponse>(
    sessionsEndpoint,
    fetchDashboardSessions,
    {
      fallbackData: { sessions: [params.initialSession] },
      refreshInterval: pollIntervalMs,
      revalidateOnFocus: true,
    },
  );

  const session = useMemo(() => {
    const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
    return (
      sessions.find(
        (candidate) =>
          candidate.session_id === params.initialSession.session_id,
      ) ?? params.initialSession
    );
  }, [data?.sessions, params.initialSession]);

  const { steps, eventHistory, productDetails } = useMemo(() => {
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

    const eventHistory = [...session.events].sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );

    const productDetails = extractProductDetails({
      events: session.events,
      fallbackName: session.pipeline_type.replace(/_/g, " "),
      fallbackSku: session.session_id,
    });

    return {
      steps,
      eventHistory,
      productDetails,
    };
  }, [session.events, session.pipeline_type, session.session_id]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Pipeline detail</p>
          <h1 className={styles.title}>{session.session_id}</h1>
          <p className={styles.subtitle}>{session.pipeline_type}</p>
        </div>
        <div className={styles.headerActions}>
          <Link
            className={styles.secondaryButton}
            href={`/dashboard/pipeline/${session.session_id}/receipt`}
          >
            View receipt
          </Link>
          <button className={styles.ghostButton} disabled>
            Replay pipeline
          </button>
        </div>
      </header>

      <section className={styles.productCard}>
        <div className={styles.productHeader}>
          <div>
            <h2>Product</h2>
            <p className={styles.panelHint}>Checkout payload snapshot</p>
          </div>
          <Link
            className={styles.productLink}
            href={`/dashboard/product/${productDetails.productId}`}
          >
            View product
          </Link>
        </div>
        <div className={styles.productGrid}>
          <div className={styles.productItem}>
            <span className={styles.productLabel}>Name</span>
            <span className={styles.productValue}>{productDetails.name}</span>
          </div>
          <div className={styles.productItem}>
            <span className={styles.productLabel}>SKU</span>
            <span className={styles.productValue}>{productDetails.sku}</span>
          </div>
          <div className={styles.productItem}>
            <span className={styles.productLabel}>Qty</span>
            <span className={styles.productValue}>
              {productDetails.quantity}
            </span>
          </div>
          <div className={styles.productItem}>
            <span className={styles.productLabel}>Price</span>
            <span className={styles.productValue}>{productDetails.price}</span>
          </div>
        </div>
      </section>

      <section className={styles.detailGrid}>
        <div className={styles.timelineCard}>
          <div className={styles.panelHeader}>
            <h2>Step timeline</h2>
            <p className={styles.panelHint}>Latest event per step</p>
          </div>
          <ol className={styles.timelineList}>
            {steps.map((step, index) => (
              <li key={step.step} className={styles.timelineItem}>
                <div className={styles.timelineRail}>
                  <span
                    className={`${styles.timelineDot} ${styles[step.status] ?? ""}`}
                  />
                  {index < steps.length - 1 && (
                    <span className={styles.timelineLine} />
                  )}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineTitleRow}>
                    <span className={styles.stepName}>{step.step}</span>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[step.status] ?? ""
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className={styles.stepMeta}>
                    {step.duration !== null ? `${step.duration}ms` : "--"} ·{" "}
                    {formatTimestamp({ timestamp: step.lastSeen })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

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
      </section>

      <section className={styles.historyCard}>
        <div className={styles.panelHeader}>
          <h2>Event history</h2>
          <p className={styles.panelHint}>All events in order</p>
        </div>
        {eventHistory.length === 0 ? (
          <p className={styles.emptyState}>No events recorded yet.</p>
        ) : (
          <ul className={styles.historyList}>
            {eventHistory.map((event) => (
              <li
                key={`${event.id}-${event.timestamp}`}
                className={styles.historyItem}
              >
                <div>
                  <div className={styles.historyTitle}>
                    <span className={styles.stepName}>{event.step}</span>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[event.status] ?? ""
                      }`}
                    >
                      {event.status}
                    </span>
                  </div>
                  <p className={styles.stepMeta}>
                    {event.handler ? `Handler: ${event.handler}` : ""}
                    {event.handler ? " · " : ""}
                    {event.duration_ms ? `${event.duration_ms}ms` : "--"}
                  </p>
                </div>
                <span className={styles.historyTime}>
                  {formatTimestamp({ timestamp: event.timestamp })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
