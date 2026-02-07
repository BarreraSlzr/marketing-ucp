"use client";

import { billingAddressParsers, shippingAddressParsers } from "@repo/entities";
import { FormField, Input } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import styles from "./address-form.module.css";

export const BILLING_FORM_ID = "billing-address-form";
export const SHIPPING_FORM_ID = "shipping-address-form";

interface AddressFormProps {
  type: "billing" | "shipping";
}

export function AddressForm({ type }: AddressFormProps) {
  const parsers =
    type === "billing" ? billingAddressParsers : shippingAddressParsers;
  const [params] = useQueryStates(parsers, { shallow: false });
  const formId = type === "billing" ? BILLING_FORM_ID : SHIPPING_FORM_ID;
  const prefix = type;
  const t = useTranslations("forms.address");

  return (
    <div className={styles.grid}>
      {/* Hidden field for the server action to know which address type */}
      <input type="hidden" name="_address_type" value={type} form={formId} />

      <FormField
        name={`${prefix}_line1`}
        label={t("line1Label")}
        className={styles.fullWidth}
      >
        <Input
          id={`${prefix}_line1`}
          name={`${prefix}_line1`}
          form={formId}
          defaultValue={params[`${prefix}_line1` as keyof typeof params] ?? ""}
          placeholder={t("line1Placeholder")}
          required
        />
      </FormField>

      <FormField
        name={`${prefix}_line2`}
        label={t("line2Label")}
        className={styles.fullWidth}
      >
        <Input
          id={`${prefix}_line2`}
          name={`${prefix}_line2`}
          form={formId}
          defaultValue={params[`${prefix}_line2` as keyof typeof params] ?? ""}
          placeholder={t("line2Placeholder")}
        />
      </FormField>

      <div className={styles.row3}>
        <FormField name={`${prefix}_city`} label={t("cityLabel")}>
          <Input
            id={`${prefix}_city`}
            name={`${prefix}_city`}
            form={formId}
            defaultValue={params[`${prefix}_city` as keyof typeof params] ?? ""}
            placeholder={t("cityPlaceholder")}
            required
          />
        </FormField>

        <FormField name={`${prefix}_state`} label={t("stateLabel")}>
          <Input
            id={`${prefix}_state`}
            name={`${prefix}_state`}
            form={formId}
            defaultValue={
              params[`${prefix}_state` as keyof typeof params] ?? ""
            }
            placeholder={t("statePlaceholder")}
          />
        </FormField>

        <FormField name={`${prefix}_postal_code`} label={t("postalLabel")}>
          <Input
            id={`${prefix}_postal_code`}
            name={`${prefix}_postal_code`}
            form={formId}
            defaultValue={
              params[`${prefix}_postal_code` as keyof typeof params] ?? ""
            }
            placeholder={t("postalPlaceholder")}
            required
          />
        </FormField>
      </div>

      <FormField name={`${prefix}_country`} label={t("countryLabel")}>
        <Input
          id={`${prefix}_country`}
          name={`${prefix}_country`}
          form={formId}
          defaultValue={
            params[`${prefix}_country` as keyof typeof params] ?? ""
          }
          placeholder={t("countryPlaceholder")}
          maxLength={2}
          required
        />
      </FormField>
    </div>
  );
}
