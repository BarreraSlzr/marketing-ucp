"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

export function DemoControls() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const demoKey = process.env.NEXT_PUBLIC_DEMO_API_KEY;

  const runDemo = async () => {
    try {
      setIsLoading(true);
      setStatus(null);
      const response = await fetch("/api/pipeline/demo", {
        method: "POST",
        headers: demoKey ? { "x-demo-key": demoKey } : undefined,
      });
      if (!response.ok) {
        throw new Error("Failed to generate demo events");
      }
      setStatus("Demo events generated");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Demo failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.demoControls}>
      <button
        className={styles.secondaryButton}
        type="button"
        onClick={runDemo}
        disabled={isLoading}
      >
        {isLoading ? "Running demo..." : "Run demo"}
      </button>
      {status && <span className={styles.demoStatus}>{status}</span>}
    </div>
  );
}
