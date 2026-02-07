// LEGEND: Pipeline observability viewer page
// Displays event hierarchies and pipeline status by session_id
// All usage must comply with this LEGEND and the LICENSE

"use client";

import { useEffect, useState } from "react";
import { PipelineEventHierarchy } from "@/components/pipeline/event-hierarchy";
import type { PipelineEvent, PipelineChecksum } from "@repo/pipeline";
import styles from "./page.module.css";

interface PipelineSession {
  session_id: string;
  pipeline_type: string;
  events: PipelineEvent[];
  checksum: PipelineChecksum | null;
  last_updated: string;
}

export default function PipelinePage() {
  const [sessions, setSessions] = useState<PipelineSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPipelineSessions();
  }, []);

  const loadPipelineSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all pipeline sessions
      const response = await fetch("/api/pipeline/sessions");
      if (!response.ok) {
        throw new Error("Failed to load pipeline sessions");
      }
      const data = await response.json();
      setSessions(data.sessions || []);

      // Auto-select first session if available
      if (data.sessions && data.sessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data.sessions[0].session_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const selectedSession = sessions.find(s => s.session_id === selectedSessionId);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Pipeline Observability</h1>
        </div>
        <div className={styles.loading}>Loading pipeline data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Pipeline Observability</h1>
        </div>
        <div className={styles.error}>Error: {error}</div>
        <button onClick={loadPipelineSessions} className={styles.button}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pipeline Observability</h1>
        <div className={styles.actions}>
          <button onClick={loadPipelineSessions} className={styles.button}>
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Sessions</div>
          <div className={styles.statValue}>{sessions.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Events</div>
          <div className={styles.statValue}>
            {sessions.reduce((sum, s) => sum + s.events.length, 0)}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Valid Pipelines</div>
          <div className={styles.statValue}>
            {sessions.filter(s => s.checksum?.is_valid).length}
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No pipeline events recorded</h2>
          <p>
            Pipeline events will appear here automatically when checkout processes run.
          </p>
          <p>
            To start collecting events, use the checkout flow or emit events via the API.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.sessionSelector}>
            <label htmlFor="session-select" className={styles.label}>
              Select Session:
            </label>
            <select
              id="session-select"
              value={selectedSessionId || ""}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className={styles.select}
            >
              {sessions.map((session) => (
                <option key={session.session_id} value={session.session_id}>
                  {session.session_id} - {session.pipeline_type} ({session.events.length} events)
                </option>
              ))}
            </select>
          </div>

          {selectedSession && (
            <PipelineEventHierarchy
              sessionId={selectedSession.session_id}
              pipelineType={selectedSession.pipeline_type}
              events={selectedSession.events}
              checksum={selectedSession.checksum}
            />
          )}
        </>
      )}

      <div className={styles.instructions}>
        <h3>How to use</h3>
        <ul>
          <li>
            <strong>Session Filter:</strong> Select a session_id to view its complete event hierarchy
          </li>
          <li>
            <strong>Event Timeline:</strong> Events are displayed chronologically with status indicators
          </li>
          <li>
            <strong>Status Indicators:</strong>
            <span className={`${styles.statusBadge} ${styles.success}`}>✓</span> Success,
            <span className={`${styles.statusBadge} ${styles.failure}`}>✗</span> Failure,
            <span className={`${styles.statusBadge} ${styles.pending}`}>⋯</span> Pending,
            <span className={`${styles.statusBadge} ${styles.skipped}`}>−</span> Skipped
          </li>
          <li>
            <strong>Chain Hash:</strong> Each pipeline has a tamper-proof checksum for verification
          </li>
        </ul>
      </div>
    </div>
  );
}
