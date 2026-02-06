"use client";

import { useQueryStates } from "nuqs";
import { buyerParsers } from "@repo/entities";
import { Input, FormField, Checkbox } from "@repo/ui";
import styles from "./buyer-form.module.scss";

export const BUYER_FORM_ID = "buyer-form";

export function BuyerForm() {
  const [params] = useQueryStates(buyerParsers, { shallow: false });

  return (
    <div className={styles.grid}>
      <FormField
        name="buyer_email"
        label="Email"
        description="Required for order confirmation"
      >
        <Input
          id="buyer_email"
          name="buyer_email"
          type="email"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_email}
          placeholder="buyer@example.com"
          required
        />
      </FormField>

      <FormField name="buyer_phone" label="Phone">
        <Input
          id="buyer_phone"
          name="buyer_phone"
          type="tel"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_phone ?? ""}
          placeholder="+1 (555) 000-0000"
        />
      </FormField>

      <FormField name="buyer_first_name" label="First Name">
        <Input
          id="buyer_first_name"
          name="buyer_first_name"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_first_name ?? ""}
          placeholder="Jane"
        />
      </FormField>

      <FormField name="buyer_last_name" label="Last Name">
        <Input
          id="buyer_last_name"
          name="buyer_last_name"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_last_name ?? ""}
          placeholder="Doe"
        />
      </FormField>

      <FormField
        name="buyer_customer_id"
        label="Customer ID"
        className={styles.fullWidth}
      >
        <Input
          id="buyer_customer_id"
          name="buyer_customer_id"
          form={BUYER_FORM_ID}
          defaultValue={params.buyer_customer_id ?? ""}
          placeholder="cust_abc123"
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
          I agree to receive marketing communications
        </label>
      </div>
    </div>
  );
}
