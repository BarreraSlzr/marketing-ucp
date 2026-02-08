import { PipelineReceiptCard } from "@/components/pipeline/pipeline-receipt";
import { Link } from "@/i18n/navigation";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, prefixPath } from "@/lib/i18n";
import { generateDemoPipelineEvents } from "@/lib/pipeline-demo";
import {
  PipelineReceiptSchema,
  computePipelineReceipt,
  getPipelineDefinition,
  type PipelineReceipt,
} from "@repo/pipeline";
import { headers } from "next/headers";
import { getDashboardSessionById } from "../../../data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getBaseUrl(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function encodeReceiptPayload(params: { receipt: PipelineReceipt }): string {
  const json = JSON.stringify(params.receipt);
  return Buffer.from(json, "utf8").toString("base64url");
}

function decodeReceiptPayload(params: {
  payload: string;
}): PipelineReceipt | null {
  try {
    const json = Buffer.from(params.payload, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as unknown;
    const result = PipelineReceiptSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch (error) {
    return null;
  }
}

export default async function PipelineReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale?: string }>;
  searchParams?: { receipt?: string };
}) {
  const { id, locale } = await params;
  const receiptParam = searchParams?.receipt;
  let receipt: PipelineReceipt | null = null;
  let warning: string | null = null;

  if (receiptParam) {
    receipt = decodeReceiptPayload({ payload: receiptParam });
    if (!receipt) {
      warning = "Receipt payload could not be verified.";
    }
  }

  if (!receipt) {
    let session = null as Awaited<ReturnType<typeof getDashboardSessionById>>;

    try {
      session = await getDashboardSessionById({ sessionId: id });
      if (!session && id.startsWith("demo_")) {
        await generateDemoPipelineEvents();
        session = await getDashboardSessionById({ sessionId: id });
      }
    } catch (error) {
      warning =
        error instanceof Error ? error.message : "Failed to load pipeline";
    }

    if (!session) {
      return (
        <div className={styles.page}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Verification receipt</p>
              <h1 className={styles.title}>{id}</h1>
              <p className={styles.subtitle}>Receipt not available.</p>
            </div>
            <Link
              className={styles.backLink}
              href={`/dashboard/pipeline/${id}`}
            >
              Back to pipeline
            </Link>
          </header>
          <p className={styles.emptyState}>
            {warning ?? "No pipeline events were recorded for this session."}
          </p>
        </div>
      );
    }

    const definition = getPipelineDefinition({ type: session.pipeline_type });
    if (!definition) {
      return (
        <div className={styles.page}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Verification receipt</p>
              <h1 className={styles.title}>{id}</h1>
              <p className={styles.subtitle}>Unknown pipeline type.</p>
            </div>
            <Link
              className={styles.backLink}
              href={`/dashboard/pipeline/${id}`}
            >
              Back to pipeline
            </Link>
          </header>
          <p className={styles.emptyState}>
            Unable to build a receipt without a pipeline definition.
          </p>
        </div>
      );
    }

    receipt = await computePipelineReceipt({
      definition,
      events: session.events,
      session_id: session.session_id,
    });
  }

  if (!receipt) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Verification receipt</p>
            <h1 className={styles.title}>{id}</h1>
            <p className={styles.subtitle}>Receipt not available.</p>
          </div>
          <Link className={styles.backLink} href={`/dashboard/pipeline/${id}`}>
            Back to pipeline
          </Link>
        </header>
        <p className={styles.emptyState}>
          {warning ?? "Unable to generate receipt."}
        </p>
      </div>
    );
  }

  const sessionId = receipt.session_id;
  const resolvedLocale = SUPPORTED_LOCALES.includes(locale as never)
    ? (locale as (typeof SUPPORTED_LOCALES)[number])
    : DEFAULT_LOCALE;
  const baseUrl = await getBaseUrl();
  const receiptPath = prefixPath({
    locale: resolvedLocale,
    path: `/dashboard/pipeline/${sessionId}/receipt`,
  });
  const shareUrl = `${baseUrl}${receiptPath}?receipt=${encodeReceiptPayload({
    receipt,
  })}`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Verification receipt</p>
          <h1 className={styles.title}>Pipeline receipt</h1>
          <p className={styles.subtitle}>
            Immutable checksum trail for this pipeline.
          </p>
        </div>
        <Link
          className={styles.backLink}
          href={`/dashboard/pipeline/${sessionId}`}
        >
          Back to pipeline
        </Link>
      </header>

      {warning && <p className={styles.warning}>{warning}</p>}

      <PipelineReceiptCard receipt={receipt} shareUrl={shareUrl} />
    </div>
  );
}
