"use client";

/**
 * Example client component showing how to use useSWR for real-time pipeline tracking.
 * 
 * Note: This is a reference implementation. In production, you would:
 * 1. Install swr: `bun add swr`
 * 2. Use actual session IDs from checkout state
 * 3. Add error boundaries and loading states
 * 4. Style according to your design system
 */

// Uncomment when swr is installed:
// import useSWR from "swr";

interface PipelineStatusProps {
  sessionId: string;
  pipelineType: "checkout_physical" | "checkout_digital" | "checkout_subscription";
  refreshInterval?: number;
}

/**
 * Real-time pipeline status tracker using useSWR polling
 * 
 * Usage:
 * ```tsx
 * <PipelineStatus 
 *   sessionId="chk_abc123" 
 *   pipelineType="checkout_digital"
 *   refreshInterval={2000}  // Poll every 2 seconds
 * />
 * ```
 */
export function PipelineStatus({
  sessionId,
  pipelineType,
  refreshInterval = 3000,
}: PipelineStatusProps) {
  // TODO: Uncomment when swr is installed
  /*
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  
  const { data, error, isLoading } = useSWR(
    `/api/pipeline/status?session_id=${sessionId}&pipeline_type=${pipelineType}`,
    fetcher,
    { refreshInterval }
  );

  if (isLoading) {
    return (
      <div className="pipeline-status loading">
        <h3>Pipeline Status</h3>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pipeline-status error">
        <h3>Pipeline Status</h3>
        <p>Error loading status: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { current_checksum, events, latest_snapshot, registry_history } = data;
  const progressPercent = (current_checksum.steps_completed / current_checksum.steps_expected) * 100;

  return (
    <div className="pipeline-status">
      <h3>Pipeline: {pipelineType}</h3>
      
      <div className="progress">
        <div className="progress-bar" style={{ width: `${progressPercent}%` }} />
        <span>
          {current_checksum.steps_completed} / {current_checksum.steps_expected} steps
        </span>
      </div>

      <div className="status-badge">
        {current_checksum.is_valid ? (
          <span className="badge success">✓ Valid</span>
        ) : (
          <span className="badge warning">⚠ In Progress</span>
        )}
      </div>

      <div className="checksum-info">
        <h4>Current Checksum</h4>
        <code>{current_checksum.chain_hash.substring(0, 16)}...</code>
        <p>
          Computed at: {new Date(current_checksum.computed_at).toLocaleTimeString()}
        </p>
      </div>

      <div className="recent-events">
        <h4>Recent Events ({events.length})</h4>
        <ul>
          {events.slice(0, 5).map((event) => (
            <li key={event.id}>
              <span className={`status-icon ${event.status}`}>
                {event.status === "success" ? "✓" : event.status === "failure" ? "✗" : "⋯"}
              </span>
              <span className="step-name">{event.step}</span>
              <span className="timestamp">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {latest_snapshot && (
        <div className="latest-snapshot">
          <h4>Latest Snapshot</h4>
          <p>
            Created: {new Date(latest_snapshot.created_at).toLocaleString()}
          </p>
          {latest_snapshot.notes && <p className="notes">{latest_snapshot.notes}</p>}
        </div>
      )}

      <div className="history-summary">
        <h4>History</h4>
        <p>{registry_history.length} snapshots recorded</p>
      </div>
    </div>
  );
  */

  return (
    <div className="pipeline-status placeholder">
      <h3>Pipeline Status (Example)</h3>
      <p>
        To use this component, install SWR: <code>bun add swr</code>
      </p>
      <p>Session ID: {sessionId}</p>
      <p>Pipeline Type: {pipelineType}</p>
      <p>Refresh Interval: {refreshInterval}ms</p>
    </div>
  );
}

/**
 * Simplified status display without real-time polling
 */
export function PipelineStatusSimple({
  sessionId,
  pipelineType,
}: Omit<PipelineStatusProps, "refreshInterval">) {
  return (
    <div className="pipeline-status-simple">
      <h4>Pipeline Status</h4>
      <p>Session: {sessionId}</p>
      <p>Type: {pipelineType}</p>
      <p>Status: Tracking...</p>
    </div>
  );
}
