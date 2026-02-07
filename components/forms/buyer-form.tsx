"use client";

import { buyerParsers } from "@repo/entities";
import { Checkbox, FormField, Input } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import styles from "./buyer-form.module.css";

export const BUYER_FORM_ID = "buyer-form";

export function BuyerForm() {
  const [params] = useQueryStates(buyerParsers, { shallow: false });
  const t = useTranslations("forms.buyer");

  return (
    <div className={styles.grid}>
      <FormField
        name="buyer_email"
        label={t("emailLabel")}
        description={t("emailDescription")}
      >
        <Input
          id="buyer_email"
          name="buyer_email"
          type="email"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_email}
          placeholder={t("emailPlaceholder")}
          required
        />
      </FormField>

      <FormField name="buyer_phone" label={t("phoneLabel")}>
        <Input
          id="buyer_phone"
          name="buyer_phone"
          type="tel"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_phone ?? ""}
          placeholder={t("phonePlaceholder")}
        />
      </FormField>

      <FormField name="buyer_first_name" label={t("firstNameLabel")}>
        <Input
          id="buyer_first_name"
          name="buyer_first_name"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_first_name ?? ""}
          placeholder={t("firstNamePlaceholder")}
        />
      </FormField>

      <FormField name="buyer_last_name" label={t("lastNameLabel")}>
        <Input
          id="buyer_last_name"
          name="buyer_last_name"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_last_name ?? ""}
          placeholder={t("lastNamePlaceholder")}
        />
      </FormField>

      <FormField
        name="buyer_customer_id"
        label={t("customerIdLabel")}
        className={styles.fullWidth}
      >
        <Input
          id="buyer_customer_id"
          name="buyer_customer_id"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_customer_id ?? ""}
          placeholder={t("customerIdPlaceholder")}
        />
      </FormField>

      <div className={styles.marketingRow}>
        <Checkbox
          id="buyer_accepts_marketing"
          name="buyer_accepts_marketing"
          form={BUYER_FORM_ID}
          defaultChecked={params.buyer_accepts_marketing ?? false}
          value="true"
        />
        <label
          htmlFor="buyer_accepts_marketing"
          className={styles.marketingLabel}
        >
          {t("marketingLabel")}
        </label>
      </div>
    </div>
  );
}
