"use client";

import type { WorkflowDefinition } from "@repo/workflows";
import { Plus, X } from "lucide-react";
import { useQueryStates } from "nuqs";
import { parseAsJson, parseAsString } from "nuqs/server";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import styles from "./page.module.css";

type FilterKey = "category" | "pipeline" | "step_kind" | "required";

const filterLabels: Record<FilterKey, string> = {
  category: "Category",
  pipeline: "Pipeline",
  step_kind: "Step type",
  required: "Required",
};

type WorkflowFilter = { key: FilterKey; value: string };

function parseWorkflowFilters(value: unknown): WorkflowFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const keys: FilterKey[] = ["category", "pipeline", "step_kind", "required"];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const key = record.key;
      const filterValue = record.value;
      if (!keys.includes(key as FilterKey)) {
        return null;
      }
      if (typeof filterValue !== "string") {
        return null;
      }
      return { key: key as FilterKey, value: filterValue };
    })
    .filter((entry): entry is WorkflowFilter => Boolean(entry));
}

const workflowParsers = {
  wf_search: parseAsString.withDefault(""),
  wf_filters: parseAsJson(parseWorkflowFilters).withDefault([]),
};

export function WorkflowListClient({
  workflows,
}: {
  workflows: WorkflowDefinition[];
}) {
  const [query, setQuery] = useQueryStates(workflowParsers, {
    shallow: false,
  });
  const [activeKey, setActiveKey] = useState<FilterKey>("category");
  const [activeValue, setActiveValue] = useState<string>("");

  const filters = query.wf_filters ?? [];
  const search = query.wf_search ?? "";

  const filterOptions = useMemo(() => {
    const categories = Array.from(
      new Set(workflows.map((workflow) => workflow.category)),
    ).sort();
    const pipelineTypes = Array.from(
      new Set(
        workflows.flatMap((workflow) =>
          workflow.pipeline_type ? [workflow.pipeline_type] : [],
        ),
      ),
    ).sort();
    const stepKinds = Array.from(
      new Set(
        workflows.flatMap((workflow) =>
          workflow.steps.map((step) => step.kind),
        ),
      ),
    ).sort();

    return {
      category: categories,
      pipeline: pipelineTypes,
      step_kind: stepKinds,
      required: ["required", "optional"],
    } satisfies Record<FilterKey, string[]>;
  }, [workflows]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((workflow) => {
      const matchesSearch = normalizedSearch
        ? [
            workflow.name,
            workflow.description,
            workflow.id,
            workflow.pipeline_type ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch)
        : true;

      if (!matchesSearch) {
        return false;
      }

      return filters.every((filter) => {
        if (filter.key === "category") {
          return workflow.category === filter.value;
        }
        if (filter.key === "pipeline") {
          return workflow.pipeline_type === filter.value;
        }
        if (filter.key === "step_kind") {
          return workflow.steps.some((step) => step.kind === filter.value);
        }
        if (filter.key === "required") {
          const wantsRequired = filter.value === "required";
          return workflow.steps.some((step) => step.required === wantsRequired);
        }
        return true;
      });
    });
  }, [filters, normalizedSearch, workflows]);

  const addFilter = () => {
    if (!activeValue) {
      return;
    }
    const exists = filters.some(
      (filter) => filter.key === activeKey && filter.value === activeValue,
    );
    if (exists) {
      return;
    }
    setQuery({ wf_filters: [...filters, { key: activeKey, value: activeValue }] });
    setActiveValue("");
  };

  const removeFilter = (index: number) => {
    setQuery({
      wf_filters: filters.filter((_, idx) => idx !== index),
    });
  };

  const clearFilters = () => {
    setQuery({ wf_filters: [], wf_search: "" });
  };

  return (
    <div className={styles.workflowContainer}>
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Search</span>
          <input
            className={styles.filterInput}
            placeholder="Search by name, id, or pipeline"
            value={search}
            onChange={(event) => setQuery({ wf_search: event.target.value })}
          />
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Filter</span>
          <select
            className={styles.filterSelect}
            value={activeKey}
            onChange={(event) => {
              setActiveKey(event.target.value as FilterKey);
              setActiveValue("");
            }}
          >
            {Object.entries(filterLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={activeValue}
            onChange={(event) => setActiveValue(event.target.value)}
          >
            <option value="">Select value</option>
            {filterOptions[activeKey].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            className={styles.iconButton}
            type="button"
            onClick={addFilter}
            disabled={!activeValue}
            aria-label="Add filter"
          >
            <Plus size={16} />
          </button>
          <button
            className={styles.textButton}
            type="button"
            onClick={clearFilters}
            disabled={filters.length === 0 && !search}
          >
            Clear
          </button>
        </div>
      </div>

      {filters.length > 0 && (
        <div className={styles.activeFilters}>
          {filters.map((filter, index) => (
            <span key={`${filter.key}-${filter.value}`} className={styles.filterPill}>
              {filterLabels[filter.key]}: {filter.value}
              <button
                type="button"
                className={styles.filterPillButton}
                onClick={() => removeFilter(index)}
                aria-label="Remove filter"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className={styles.resultCount}>
        {filteredWorkflows.length} workflow
        {filteredWorkflows.length === 1 ? "" : "s"} matched
      </p>

      {filteredWorkflows.length === 0 ? (
        <p className={styles.emptyState}>No workflow definitions available.</p>
      ) : (
        <div className={styles.workflowList}>
          {filteredWorkflows.map((workflow) => (
            <Link
              key={workflow.id}
              className={styles.workflowCard}
              href={`/dashboard/workflows/${workflow.id}`}
            >
              <div>
                <p className={styles.workflowName}>{workflow.name}</p>
                <p className={styles.workflowDescription}>
                  {workflow.description}
                </p>
              </div>
              <div className={styles.workflowMeta}>
                <span className={styles.pill}>{workflow.category}</span>
                {workflow.pipeline_type && (
                  <span className={styles.pill}>{workflow.pipeline_type}</span>
                )}
                <span className={styles.pill}>
                  {workflow.steps.length} steps
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
