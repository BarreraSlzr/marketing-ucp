"use client";

import type { CrossPlatformSessionData } from "@/packages/pipeline/cross-platform-bridge";
import useSWR from "swr";
import styles from "./cross-platform-data.module.css";

// LEGEND: CrossPlatformData component
// Displays unified view of internal and external platform data
// All usage must comply with this LEGEND and the LICENSE

interface CrossPlatformDataProps {
  sessionId: string;
  platforms?: string[];
}

async function fetchCrossPlatformData(params: {
  sessionId: string;
  platforms?: string[];
}): Promise<CrossPlatformSessionData> {
  const searchParams = new URLSearchParams({ sessionId: params.sessionId });
  if (params.platforms) {
    params.platforms.forEach((p) => searchParams.append("platform", p));
  }

  const response = await fetch(
    `/api/pipeline/cross-platform?${searchParams}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch cross-platform data");
  }

  return response.json();
}

export function CrossPlatformData(props: CrossPlatformDataProps) {
  const { sessionId, platforms } = props;

  const { data, error, isLoading } = useSWR(
    { sessionId, platforms },
    fetchCrossPlatformData,
    {
      refreshInterval: 5000, // Poll every 5 seconds
      revalidateOnFocus: true,
    }
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Loading cross-platform data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <p>Failed to load cross-platform data</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasExternalData = Object.keys(data.externalData).length > 0;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Cross-Platform Session Data</h3>

      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Session Info</h4>
        <div className={styles.info}>
          <span className={styles.infoLabel}>Session ID:</span>
          <code className={styles.infoValue}>{data.sessionId}</code>
        </div>
        {data.workflowId && (
          <div className={styles.info}>
            <span className={styles.infoLabel}>Workflow ID:</span>
            <code className={styles.infoValue}>{data.workflowId}</code>
          </div>
        )}
      </div>

      {hasExternalData ? (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>External Platform Data</h4>
          <div className={styles.platformList}>
            {Object.entries(data.externalData).map(([platform, platformData]) => (
              <PlatformCard
                key={platform}
                platform={platform}
                data={platformData}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <p>No external platform data linked to this session</p>
        </div>
      )}
    </div>
  );
}

interface PlatformCardProps {
  platform: string;
  data: unknown;
}

function PlatformCard(props: PlatformCardProps) {
  const { platform, data } = props;

  const platformColors: Record<string, string> = {
    stripe: "#635bff",
    shopify: "#95bf47",
    "stripe-customer": "#635bff",
    "shopify-checkout": "#95bf47",
  };

  const color = platformColors[platform] || "var(--color-primary)";

  return (
    <div className={styles.platformCard}>
      <div className={styles.platformHeader}>
        <span
          className={styles.platformName}
          style={{ borderColor: color, color }}
        >
          {platform}
        </span>
      </div>

      <details className={styles.platformData}>
        <summary className={styles.platformDataSummary}>View data</summary>
        <pre className={styles.platformDataContent}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
