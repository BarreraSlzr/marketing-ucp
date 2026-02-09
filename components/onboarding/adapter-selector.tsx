"use client";

// LEGEND: Adapter template selector for onboarding
// Allows users to pick which payment adapter to onboard with
// All usage must comply with this LEGEND and the LICENSE

import type { OnboardingTemplate } from "@repo/onboarding";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";
import * as React from "react";
import styles from "./adapter-selector.module.css";

export interface AdapterSelectorProps {
  templates: OnboardingTemplate[];
  selectedId?: string;
  onSelect: (params: { templateId: string }) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  payment: "Payment Processors",
  storefront: "Storefront Integrations",
  web3: "Web3 / Crypto",
  bank_transfer: "Bank Transfers",
  cash_payment: "Cash Payment Networks",
  compliance: "KYC/KYB Compliance",
  subscription: "Subscriptions",
  dispute: "Disputes & Chargebacks",
  refund: "Refunds",
};

export function AdapterSelector(props: AdapterSelectorProps) {
  const { templates, selectedId, onSelect } = props;

  // Group templates by category
  const grouped = React.useMemo(() => {
    const map = new Map<string, OnboardingTemplate[]>();
    for (const t of templates) {
      const cat = t.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return map;
  }, [templates]);

  return (
    <div className={styles.container}>
      {Array.from(grouped.entries()).map(([category, items]) => (
        <div key={category} className={styles.categorySection}>
          <h3 className={styles.categoryTitle}>
            {CATEGORY_LABELS[category] ?? category}
          </h3>
          <div className={styles.grid}>
            {items.map((template) => (
              <Card
                key={template.id}
                className={`${styles.card} ${
                  selectedId === template.id ? styles.selected : ""
                }`}
              >
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={styles.meta}>
                    {template.regions.length > 0 && (
                      <span className={styles.regions}>
                        {template.regions.includes("global")
                          ? "Global"
                          : template.regions.join(", ")}
                      </span>
                    )}
                    <span className={styles.fieldCount}>
                      {template.fields.filter((f) => f.required).length}{" "}
                      required fields
                    </span>
                  </div>
                  <Button
                    variant={selectedId === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSelect({ templateId: template.id })}
                    className={styles.selectButton}
                  >
                    {selectedId === template.id ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
