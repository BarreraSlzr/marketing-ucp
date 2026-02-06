"use client";

import { useQueryStates } from "nuqs";
import { productParsers } from "@repo/entities";
import { FormSection } from "@/components/checkout/form-section";
import { ProductForm, PRODUCT_FORM_ID } from "@/components/forms";
import { submitProductAction } from "@/app/actions";

/* ── Product Templates for quick-start ───────────────────── */
const PRODUCT_TEMPLATES = [
  {
    label: "Flower Bouquet",
    params: {
      product_name: "Red Roses Bouquet",
      product_description:
        "A stunning arrangement of 12 long-stem red roses, hand-tied with eucalyptus.",
      product_price: 3500,
      product_currency: "USD",
      product_sku: "ROSES-RED-12",
      product_category: "Flowers",
      product_vendor: "Rose Garden Co.",
      product_inventory: 50,
      product_published: true,
    },
  },
  {
    label: "SaaS License",
    params: {
      product_name: "Pro License - Annual",
      product_description:
        "Full access to all Pro features for 12 months. Includes priority support.",
      product_price: 9900,
      product_currency: "USD",
      product_sku: "LICENSE-PRO-ANNUAL",
      product_category: "Software",
      product_vendor: "Acme Tools",
      product_inventory: 999,
      product_published: true,
    },
  },
  {
    label: "T-Shirt",
    params: {
      product_name: "UCP Logo T-Shirt (L)",
      product_description:
        "Premium cotton tee with the Universal Commerce Protocol logo. Unisex large.",
      product_price: 2999,
      product_currency: "USD",
      product_sku: "TSHIRT-UCP-L",
      product_category: "Apparel",
      product_vendor: "UCP Merch",
      product_inventory: 200,
      product_published: false,
    },
  },
  {
    label: "Subscription",
    params: {
      product_name: "Pro Plan - Monthly",
      product_description:
        "Monthly subscription to the Pro plan with all premium features.",
      product_price: 1900,
      product_currency: "USD",
      product_sku: "POLAR-PRO-MO",
      product_category: "Subscription",
      product_vendor: "Platform Inc.",
      product_inventory: 0,
      product_published: true,
    },
  },
] as const;

export function ProductCreateClient() {
  const [, setParams] = useQueryStates(productParsers, { shallow: false });

  function applyProductTemplate(
    template: (typeof PRODUCT_TEMPLATES)[number]
  ) {
    const full: Record<string, unknown> = {};
    for (const key of Object.keys(productParsers)) {
      const value = (template.params as Record<string, unknown>)[key];
      full[key] = value ?? null;
    }
    setParams(full as Parameters<typeof setParams>[0]);
  }

  return (
    <>
      {/* Product quick-start templates */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>
          Quick-start product templates
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {PRODUCT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              onClick={() => applyProductTemplate(tpl)}
              style={{
                padding: "0.375rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                borderRadius: "0.375rem",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-foreground)",
                cursor: "pointer",
              }}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      <FormSection
        formId={PRODUCT_FORM_ID}
        title="Product Details"
        description="Define your product. All fields become URL parameters for stateless sharing."
        action={submitProductAction}
        submitLabel="Save Product"
      >
        <ProductForm />
      </FormSection>
    </>
  );
}
