"use client";

import { useQueryStates } from "nuqs";
import {
  billingAddressParsers,
  shippingAddressParsers,
} from "@repo/entities";
import { Input, FormField } from "@repo/ui";
import styles from "./address-form.module.scss";

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

  return (
    <div className={styles.grid}>
      {/* Hidden field for the server action to know which address type */}
      <input type="hidden" name="_address_type" value={type} form={formId} />

      <FormField
        name={`${prefix}_line1`}
        label="Address Line 1"
        className={styles.fullWidth}
      >
        <Input
          id={`${prefix}_line1`}
          name={`${prefix}_line1`}
          form={formId}
          defaultValue={params[`${prefix}_line1` as keyof typeof params] ?? ""}
          placeholder="123 Main St"
          required
        />
      </FormField>

      <FormField
        name={`${prefix}_line2`}
        label="Address Line 2"
        className={styles.fullWidth}
      >
        <Input
          id={`${prefix}_line2`}
          name={`${prefix}_line2`}
          form={formId}
          defaultValue={params[`${prefix}_line2` as keyof typeof params] ?? ""}
          placeholder="Apt, suite, etc."
        />
      </FormField>

      <div className={styles.row3}>
        <FormField name={`${prefix}_city`} label="City">
          <Input
            id={`${prefix}_city`}
            name={`${prefix}_city`}
            form={formId}
            defaultValue={
              params[`${prefix}_city` as keyof typeof params] ?? ""
            }
            placeholder="San Francisco"
            required
          />
        </FormField>

        <FormField name={`${prefix}_state`} label="State / Province">
          <Input
            id={`${prefix}_state`}
            name={`${prefix}_state`}
            form={formId}
            defaultValue={
              params[`${prefix}_state` as keyof typeof params] ?? ""
            }
            placeholder="CA"
          />
        </FormField>

        <FormField name={`${prefix}_postal_code`} label="Postal Code">
          <Input
            id={`${prefix}_postal_code`}
            name={`${prefix}_postal_code`}
            form={formId}
            defaultValue={
              params[`${prefix}_postal_code` as keyof typeof params] ?? ""
            }
            placeholder="94102"
            required
          />
        </FormField>
      </div>

      <FormField name={`${prefix}_country`} label="Country">
        <Input
          id={`${prefix}_country`}
          name={`${prefix}_country`}
          form={formId}
          defaultValue={
            params[`${prefix}_country` as keyof typeof params] ?? ""
          }
          placeholder="US"
          maxLength={2}
          required
        />
      </FormField>
    </div>
  );
}
