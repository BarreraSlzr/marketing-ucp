"use client";

import { useQueryStates } from "nuqs";
import {
  productParsers,
  serializeProduct,
  serializeCheckout,
} from "@repo/entities";
import { Input, FormField, Checkbox, Button } from "@repo/ui";
import Link from "next/link";
import styles from "./product-form.module.css";

export const PRODUCT_FORM_ID = "product-form";

const CURRENCIES = ["USD", "EUR", "GBP", "MXN", "BRL", "JPY"];

export function ProductForm() {
  const [params] = useQueryStates(productParsers, { shallow: false });

  // Build a checkout URL from current product data
  const checkoutUrl = serializeCheckout("/checkout", {
    item_name: params.product_name || null,
    item_description: params.product_description || null,
    item_unit_price: params.product_price || null,
    item_sku: params.product_sku || null,
    item_image_url: params.product_image_url || null,
    item_quantity: 1,
    checkout_currency: params.product_currency || "USD",
    checkout_status: "incomplete",
  });

  // Build a shareable product URL
  const shareableUrl = serializeProduct("/products/create", params as Record<string, unknown>);

  function formatPrice(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  return (
    <div className={styles.grid}>
      <FormField
        name="product_name"
        label="Product Name"
        description="The public name shown to buyers"
      >
        <Input
          id="product_name"
          name="product_name"
          form={PRODUCT_FORM_ID}
          defaultValue={params.product_name}
          placeholder="Red Roses Bouquet"
          required
        />
      </FormField>

      <FormField
        name="product_description"
        label="Description"
        description="Detailed product description for SEO and buyer context"
      >
        <Input
          id="product_description"
          name="product_description"
          form={PRODUCT_FORM_ID}
          defaultValue={params.product_description}
          placeholder="A beautiful arrangement of 12 long-stem red roses..."
        />
      </FormField>

      <div className={styles.row3}>
        <FormField name="product_price" label="Price (cents)">
          <Input
            id="product_price"
            name="product_price"
            type="number"
            form={PRODUCT_FORM_ID}
            defaultValue={String(params.product_price)}
            placeholder="3500"
            min={0}
            required
          />
          {params.product_price > 0 && (
            <p className={styles.priceHint}>
              = {params.product_currency} {formatPrice(params.product_price)}
            </p>
          )}
        </FormField>

        <FormField name="product_currency" label="Currency">
          <Input
            id="product_currency"
            name="product_currency"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_currency}
            placeholder="USD"
            maxLength={3}
            list="currency-list"
            required
          />
          <datalist id="currency-list">
            {CURRENCIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormField>

        <FormField name="product_sku" label="SKU">
          <Input
            id="product_sku"
            name="product_sku"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_sku}
            placeholder="ROSES-RED-12"
          />
        </FormField>
      </div>

      <div className={styles.row2}>
        <FormField name="product_image_url" label="Image URL">
          <Input
            id="product_image_url"
            name="product_image_url"
            type="url"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_image_url ?? ""}
            placeholder="https://cdn.example.com/product.jpg"
          />
        </FormField>

        <FormField name="product_category" label="Category">
          <Input
            id="product_category"
            name="product_category"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_category ?? ""}
            placeholder="Flowers, Electronics, Apparel..."
          />
        </FormField>
      </div>

      <div className={styles.row2}>
        <FormField name="product_vendor" label="Vendor">
          <Input
            id="product_vendor"
            name="product_vendor"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_vendor ?? ""}
            placeholder="Your Store Name"
          />
        </FormField>

        <FormField name="product_inventory" label="Inventory Count">
          <Input
            id="product_inventory"
            name="product_inventory"
            type="number"
            form={PRODUCT_FORM_ID}
            defaultValue={String(params.product_inventory)}
            placeholder="100"
            min={0}
          />
        </FormField>
      </div>

      <div className={styles.publishRow}>
        <Checkbox
          id="product_published"
          name="product_published"
          form={PRODUCT_FORM_ID}
          defaultChecked={params.product_published}
          value="true"
        />
        <label htmlFor="product_published" className={styles.publishLabel}>
          Publish immediately
        </label>
      </div>

      {/* Live Preview */}
      <div className={styles.previewSection}>
        <p className={styles.previewTitle}>Generated Checkout Link</p>
        <code className={styles.previewUrl}>
          {params.product_name ? checkoutUrl : "(fill in product name to generate)"}
        </code>
        <div className={styles.previewActions}>
          {params.product_name && (
            <Button asChild size="sm">
              <Link href={checkoutUrl}>Open in Checkout</Link>
            </Button>
          )}
        </div>
      </div>

      <div className={styles.previewSection}>
        <p className={styles.previewTitle}>Shareable Product URL</p>
        <code className={styles.previewUrl}>
          {shareableUrl || "(empty)"}
        </code>
      </div>
    </div>
  );
}
