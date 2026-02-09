"use client";

import {
  demoSeedStorageKey,
  sessionsEndpoint,
  type DashboardSessionsResponse,
} from "@/lib/dashboard-sessions";
import { getIsoTimestamp } from "@/utils/stamp";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import styles from "./page.module.css";

export function DemoControls() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const demoKey = process.env.NEXT_PUBLIC_DEMO_API_KEY;

  const runDemo = async () => {
    try {
      setIsLoading(true);
      setIsRunning(true);
      try {
        localStorage.setItem(demoSeedStorageKey, getIsoTimestamp());
      } catch {
        // Ignore storage failures (private mode or disabled storage).
      }
      const response = await fetch("/api/pipeline/demo?mode=live", {
        method: "POST",
        headers: demoKey ? { "x-demo-key": demoKey } : undefined,
      });
      if (!response.ok) {
        throw new Error("Failed to generate demo events");
      }
      const payload = (await response.json()) as DashboardSessionsResponse & {
        message?: string;
        aborted?: boolean;
      };
      mutate(sessionsEndpoint);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Demo failed");
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  };

  const stopDemo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/pipeline/demo?action=stop", {
        method: "POST",
        headers: demoKey ? { "x-demo-key": demoKey } : undefined,
      });
      if (!response.ok) {
        throw new Error("Failed to stop demo");
      }
      await response.json();
    } catch (error) {
      console.error(error instanceof Error ? error.message : "Stop failed");
    } finally {
      setIsRunning(false);
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (isLoading) {
      return;
    }
    if (isRunning) {
      void stopDemo();
      return;
    }
    void runDemo();
  };

  return (
    <div className={styles.demoControls}>
      <button
        className={`${styles.demoToggleButton} ${
          isRunning ? styles.demoToggleButtonActive : ""
        }`}
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={isRunning ? "Stop demo" : "Run demo"}
        title={isRunning ? "Stop demo" : "Run demo"}
      >
        {isRunning ? (
          <Pause aria-hidden="true" size={16} />
        ) : (
          <Play aria-hidden="true" size={16} />
        )}
        <span>{isRunning ? "Stop demo" : "Run demo"}</span>
      </button>
    </div>
  );
}
