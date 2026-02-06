"use client";

import { useQueryStates } from "nuqs";
import {
  ALL_TEMPLATES,
  allParsers,
  type CheckoutTemplate,
} from "@repo/entities";
import styles from "./template-selector.module.css";

const BADGE_STYLE: Record<string, string> = {
  demo: styles.badgeDemo,
  shopify: styles.badgeShopify,
  polar: styles.badgePolar,
  custom: styles.badgeCustom,
};

function filledFieldCount(params: Partial<Record<string, unknown>>): number {
  return Object.values(params).filter(
    (v) => v !== null && v !== undefined && v !== ""
  ).length;
}

export function TemplateSelector() {
  const [, setParams] = useQueryStates(allParsers, { shallow: false });

  function applyTemplate(template: CheckoutTemplate) {
    // Cast to satisfy setParams -- partial params map to nulls for unset keys
    const full: Record<string, unknown> = {};
    for (const key of Object.keys(allParsers)) {
      const value = (template.params as Record<string, unknown>)[key];
      full[key] = value ?? null;
    }
    setParams(full as Parameters<typeof setParams>[0]);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <p className={styles.title}>Quick Start Templates</p>
        <p className={styles.description}>
          Select a template to autofill all checkout fields via URL params.
        </p>
      </div>

      <div className={styles.grid}>
        {ALL_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className={styles.card}
            onClick={() => applyTemplate(template)}
          >
            <div className={styles.cardTop}>
              <span className={styles.cardName}>{template.name}</span>
              <span
                className={`${styles.badge} ${BADGE_STYLE[template.category] ?? styles.badgeCustom}`}
              >
                {template.category}
              </span>
            </div>
            <p className={styles.cardDescription}>{template.description}</p>
            <div className={styles.cardFields}>
              <span className={styles.fieldTag}>
                {filledFieldCount(template.params)} fields
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
