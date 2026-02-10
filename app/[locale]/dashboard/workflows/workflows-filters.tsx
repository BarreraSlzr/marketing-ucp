"use client";

import { Input } from "@repo/ui";
import { WORKFLOW_DEFINITIONS } from "@repo/workflows";
import { parseAsString, useQueryStates } from "nuqs";
import styles from "./workflows-filters.module.css";

// LEGEND: WorkflowsFilters component
// Global workflow filtering with nuqs for session/pipeline/workflow filtering
// All usage must comply with this LEGEND and the LICENSE

export function WorkflowsFilters() {
  const [filters, setFilters] = useQueryStates({
    workflowId: parseAsString,
    sessionId: parseAsString,
    pipelineId: parseAsString,
    status: parseAsString,
  });

  const hasActiveFilters =
    filters.workflowId ||
    filters.sessionId ||
    filters.pipelineId ||
    filters.status;

  return (
    <div className={styles.filters}>
      <div className={styles.filterGroup}>
        <label htmlFor="workflowId" className={styles.filterLabel}>
          Workflow
        </label>
        <select
          id="workflowId"
          value={filters.workflowId || ""}
          onChange={(e) => setFilters({ workflowId: e.target.value || null })}
          className={styles.filterSelect}
        >
          <option value="">All workflows</option>
          {WORKFLOW_DEFINITIONS.map((workflow) => (
            <option key={workflow.id} value={workflow.id}>
              {workflow.name}
            </option>
          ))}
        </select>
      </div>

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

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            setFilters({
              workflowId: null,
              sessionId: null,
              pipelineId: null,
              status: null,
            })
          }
          className={styles.clearButton}
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
