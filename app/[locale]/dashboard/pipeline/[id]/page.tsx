import { Link } from "@/i18n/navigation";
import { generateDemoPipelineEvents } from "@/lib/pipeline-demo";
import { getPipelineDefinition, type PipelineEvent } from "@repo/pipeline";
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

function extractProductDetails(params: {
  events: PipelineEvent[];
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

  const productDetails = extractProductDetails({
    events: session.events,
    fallbackName: session.pipeline_type.replace(/_/g, " "),
    fallbackSku: session.session_id,
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
    </div>
  );
}
