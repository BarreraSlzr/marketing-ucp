"use client";

import type { WorkflowDefinition } from "@repo/workflows";
import { Plus, X } from "lucide-react";
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

export function WorkflowListClient({
  workflows,
}: {
  workflows: WorkflowDefinition[];
}) {
  const [filters, setFilters] = useState<
    Array<{ key: FilterKey; value: string }>
  >([]);
  const [activeKey, setActiveKey] = useState<FilterKey>("category");
  const [activeValue, setActiveValue] = useState<string>("");
  const [search, setSearch] = useState("");

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
    setFilters((current) => {
      const exists = current.some(
        (filter) => filter.key === activeKey && filter.value === activeValue,
      );
      if (exists) {
        return current;
      }
      return [...current, { key: activeKey, value: activeValue }];
    });
    setActiveValue("");
  };

  const removeFilter = (index: number) => {
    setFilters((current) => current.filter((_, idx) => idx !== index));
  };

  const clearFilters = () => {
    setFilters([]);
    setSearch("");
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
            onChange={(event) => setSearch(event.target.value)}
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
