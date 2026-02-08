import type { PipelineReceipt } from "@repo/pipeline";
import styles from "./pipeline-receipt.module.css";

interface PipelineReceiptProps {
  receipt: PipelineReceipt;
  shareUrl: string | null;
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(params: { timestamp: string }): string {
  const ms = Date.parse(params.timestamp);
  if (Number.isNaN(ms)) {
    return params.timestamp;
  }
  return dateTimeFormatter.format(ms);
}

export function PipelineReceiptCard({
  receipt,
  shareUrl,
}: PipelineReceiptProps) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Verification receipt</p>
          <h2 className={styles.title}>{receipt.session_id}</h2>
          <p className={styles.subtitle}>{receipt.pipeline_type}</p>
        </div>
        <span
          className={`${styles.statusBadge} ${
            receipt.is_valid ? styles.success : styles.failure
          }`}
        >
          {receipt.is_valid ? "Valid" : "Invalid"}
        </span>
      </header>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem} aria-label="Steps completed">
          <span className={styles.summaryLabel}>Steps completed</span>
          <span className={styles.summaryValue}>
            {receipt.steps_completed} / {receipt.steps_expected}
          </span>
        </div>
        <div className={styles.summaryItem} aria-label="Failed steps">
          <span className={styles.summaryLabel}>Failed steps</span>
          <span className={styles.summaryValue}>{receipt.steps_failed}</span>
        </div>
        <div className={styles.summaryItem} aria-label="Computed at">
          <span className={styles.summaryLabel}>Computed at</span>
          <span className={styles.summaryValue}>
            {formatDateTime({ timestamp: receipt.computed_at })}
          </span>
        </div>
      </div>

      <div className={styles.hashBlock}>
        <span className={styles.hashLabel}>Chain hash</span>
        <code className={styles.hashValue}>{receipt.chain_hash}</code>
      </div>

      {receipt.missing_steps.length > 0 && (
        <div className={styles.missingBlock}>
          <span className={styles.missingLabel}>Missing required steps</span>
          <div className={styles.missingList}>
            {receipt.missing_steps.map((step) => (
              <span key={step} className={styles.missingPill}>
                {step}
              </span>
            ))}
          </div>
        </div>
      )}

      {shareUrl && (
        <div className={styles.shareBlock}>
          <div>
            <span className={styles.shareLabel}>Shareable receipt link</span>
            <p className={styles.shareHint}>
              Use this URL to share the exact receipt snapshot.
            </p>
          </div>
          <a className={styles.shareLink} href={shareUrl}>
            {shareUrl}
          </a>
        </div>
      )}

      <div className={styles.entries}>
        <div className={styles.entriesHeader}>
          <h2>Receipt steps</h2>
          <span className={styles.entriesHint}>Ordered by execution time</span>
        </div>
        {receipt.entries.length === 0 ? (
          <p className={styles.emptyState}>No events recorded yet.</p>
        ) : (
          <ol className={styles.entriesList}>
            {receipt.entries.map((entry, index) => (
              <li key={`${entry.step}-${index}`} className={styles.entryItem}>
                <div className={styles.entryHeader}>
                  <span className={styles.entryStep}>{entry.step}</span>
                  <span
                    className={`${styles.entryStatus} ${
                      styles[entry.status] ?? ""
                    }`}
                  >
                    {entry.status}
                  </span>
                  <span className={styles.entryTime}>
                    {entry.timestamp
                      ? formatDateTime({ timestamp: entry.timestamp })
                      : "--"}
                  </span>
                </div>
                <div className={styles.entryHashes}>
                  <div>
                    <span className={styles.entryLabel}>Step hash</span>
                    <code className={styles.entryValue}>{entry.step_hash}</code>
                  </div>
                  <div>
                    <span className={styles.entryLabel}>Input checksum</span>
                    <code className={styles.entryValue}>
                      {entry.input_checksum ?? "--"}
                    </code>
                  </div>
                  <div>
                    <span className={styles.entryLabel}>Output checksum</span>
                    <code className={styles.entryValue}>
                      {entry.output_checksum ?? "--"}
                    </code>
                  </div>
                  <div>
                    <span className={styles.entryLabel}>Previous hash</span>
                    <code className={styles.entryValue}>
                      {entry.previous_hash ?? "GENESIS"}
                    </code>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
