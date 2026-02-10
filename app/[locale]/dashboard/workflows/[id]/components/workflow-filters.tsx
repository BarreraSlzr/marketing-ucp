"use client";

import { Input } from "@repo/ui";
import { parseAsString, useQueryStates } from "nuqs";
import styles from "./workflow-filters.module.css";

// LEGEND: WorkflowFilters component
// URL-based filtering with nuqs for session/pipeline filtering
// All usage must comply with this LEGEND and the LICENSE

interface WorkflowFiltersProps {
  workflowId: string;
}

export function WorkflowFilters(props: WorkflowFiltersProps) {
  const { workflowId } = props;

  const [filters, setFilters] = useQueryStates({
    sessionId: parseAsString,
    pipelineId: parseAsString,
    status: parseAsString,
  });

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="sessionId" className={styles.filterLabel}>
          Session ID
        </label>
        <Input
          id="sessionId"
          type="text"
          placeholder="Filter by session ID..."
          value={filters.sessionId || ""}
          onChange={(e) => setFilters({ sessionId: e.target.value || null })}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="pipelineId" className={styles.filterLabel}>
          Pipeline ID
        </label>
        <Input
          id="pipelineId"
          type="text"
          placeholder="Filter by pipeline ID..."
          value={filters.pipelineId || ""}
          onChange={(e) => setFilters({ pipelineId: e.target.value || null })}
          className={styles.filterInput}
        />
      </div>

      <div className={styles.filterGroup}>
        <label htmlFor="status" className={styles.filterLabel}>
          Status
        </label>
        <select
          id="status"
          value={filters.status || ""}
          onChange={(e) => setFilters({ status: e.target.value || null })}
          className={styles.filterSelect}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {(filters.sessionId || filters.pipelineId || filters.status) && (
        <button
          type="button"
          onClick={() =>
            setFilters({ sessionId: null, pipelineId: null, status: null })
          }
          className={styles.clearButton}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
