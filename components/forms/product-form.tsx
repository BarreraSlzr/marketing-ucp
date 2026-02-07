"use client";

import { formatCurrency } from "@/lib/formatters";
import {
  DEFAULT_LOCALE,
  prefixPath,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n";
import {
  productParsers,
  serializeCheckout,
  serializeProduct,
} from "@repo/entities";
import { Button, Checkbox, FormField, Input } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import styles from "./product-form.module.css";

export const PRODUCT_FORM_ID = "product-form";

const CURRENCIES = ["USD", "EUR", "GBP", "MXN", "BRL", "JPY"];

export function ProductForm() {
  const [params] = useQueryStates(productParsers, { shallow: false });
  const unitPrice = params.product_price ?? 0;
  const currency = params.product_currency || "USD";
  const rawLocale = useLocale();
  const locale = SUPPORTED_LOCALES.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : DEFAULT_LOCALE;
  const t = useTranslations("forms.product");

  // Build a checkout URL from current product data
  const checkoutUrl = prefixPath({
    locale,
    path: serializeCheckout("/checkout", {
      line_items: params.product_name
        ? [
            {
              id: params.product_sku || params.product_name,
              name: params.product_name,
              description: params.product_description || undefined,
              quantity: 1,
              unit_price: unitPrice,
              total_price: unitPrice,
              image_url: params.product_image_url || undefined,
              sku: params.product_sku || undefined,
            },
          ]
        : null,
      item_name: params.product_name || null,
      item_description: params.product_description || null,
      item_unit_price: unitPrice || null,
      item_sku: params.product_sku || null,
      item_image_url: params.product_image_url || null,
      item_quantity: 1,
      checkout_currency: currency,
      checkout_status: "incomplete",
    }),
  });

  // Build a shareable product URL
  const shareableUrl = prefixPath({
    locale,
    path: serializeProduct(
      "/products/create",
      params as Record<string, unknown>,
    ),
  });

  return (
    <div className={styles.grid}>
      <FormField
        name="product_name"
        label={t("nameLabel")}
        description={t("nameDescription")}
      >
        <Input
          id="product_name"
          name="product_name"
          form={PRODUCT_FORM_ID}
          defaultValue={params.product_name}
          placeholder={t("namePlaceholder")}
          required
        />
      </FormField>

      <FormField
        name="product_description"
        label={t("descriptionLabel")}
        description={t("descriptionDescription")}
      >
        <Input
          id="product_description"
          name="product_description"
          form={PRODUCT_FORM_ID}
          defaultValue={params.product_description}
          placeholder={t("descriptionPlaceholder")}
        />
      </FormField>

      <div className={styles.row3}>
        <FormField name="product_price" label={t("priceLabel")}>
          <Input
            id="product_price"
            name="product_price"
            type="number"
            form={PRODUCT_FORM_ID}
            defaultValue={String(params.product_price)}
            placeholder={t("pricePlaceholder")}
            min={0}
            required
          />
          {params.product_price > 0 && (
            <p className={styles.priceHint}>
              ={" "}
              {formatCurrency({
                amount: params.product_price,
                currency,
                locale,
              })}
            </p>
          )}
        </FormField>

        <FormField name="product_currency" label={t("currencyLabel")}>
          <Input
            id="product_currency"
            name="product_currency"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_currency}
            placeholder={t("currencyPlaceholder")}
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

        <FormField name="product_sku" label={t("skuLabel")}>
          <Input
            id="product_sku"
            name="product_sku"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_sku}
            placeholder={t("skuPlaceholder")}
          />
        </FormField>
      </div>

      <div className={styles.row2}>
        <FormField name="product_image_url" label={t("imageLabel")}>
          <Input
            id="product_image_url"
            name="product_image_url"
            type="url"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_image_url ?? ""}
            placeholder={t("imagePlaceholder")}
          />
        </FormField>

        <FormField name="product_category" label={t("categoryLabel")}>
          <Input
            id="product_category"
            name="product_category"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_category ?? ""}
            placeholder={t("categoryPlaceholder")}
          />
        </FormField>
      </div>

      <div className={styles.row2}>
        <FormField name="product_vendor" label={t("vendorLabel")}>
          <Input
            id="product_vendor"
            name="product_vendor"
            form={PRODUCT_FORM_ID}
            defaultValue={params.product_vendor ?? ""}
            placeholder={t("vendorPlaceholder")}
          />
        </FormField>

        <FormField name="product_inventory" label={t("inventoryLabel")}>
          <Input
            id="product_inventory"
            name="product_inventory"
            type="number"
            form={PRODUCT_FORM_ID}
            defaultValue={String(params.product_inventory)}
            placeholder={t("inventoryPlaceholder")}
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
          {t("publishLabel")}
        </label>
      </div>

      {/* Live Preview */}
      <div className={styles.previewSection}>
        <p className={styles.previewTitle}>{t("previewCheckoutTitle")}</p>
        <code className={styles.previewUrl}>
          {params.product_name ? checkoutUrl : t("previewCheckoutEmpty")}
        </code>
        <div className={styles.previewActions}>
          {params.product_name && (
            <Button asChild size="sm">
              <Link href={checkoutUrl}>{t("previewCheckoutButton")}</Link>
            </Button>
          )}
        </div>
      </div>

      <div className={styles.previewSection}>
        <p className={styles.previewTitle}>{t("previewShareTitle")}</p>
        <code className={styles.previewUrl}>
          {shareableUrl || t("previewShareEmpty")}
        </code>
      </div>
    </div>
  );
}
