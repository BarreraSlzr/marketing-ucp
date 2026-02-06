"use client";

import { useQueryStates } from "nuqs";
import { paymentParsers } from "@repo/entities";
import { Input, FormField, NativeSelect } from "@repo/ui";
import styles from "./payment-form.module.css";

export const PAYMENT_FORM_ID = "payment-form";

const credentialTypes = [
  { value: "token", label: "Token" },
  { value: "card", label: "Card" },
];

const paymentHandlers = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "square", label: "Square" },
];

export function PaymentForm() {
  const [params] = useQueryStates(paymentParsers, { shallow: false });

  return (
    <div className={styles.grid}>
      <FormField name="payment_handler" label="Payment Handler">
        <NativeSelect
          id="payment_handler"
          name="payment_handler"
          form={PAYMENT_FORM_ID}
          defaultValue={params.payment_handler}
          options={paymentHandlers}
          placeholder="Select a handler"
          required
        />
      </FormField>

      <div className={styles.row}>
        <FormField name="payment_credential_type" label="Credential Type">
          <NativeSelect
            id="payment_credential_type"
            name="payment_credential_type"
            form={PAYMENT_FORM_ID}
            defaultValue={params.payment_credential_type ?? ""}
            options={credentialTypes}
            placeholder="Select type"
          />
        </FormField>

        <FormField name="payment_token" label="Token / Reference">
          <Input
            id="payment_token"
            name="payment_token"
            form={PAYMENT_FORM_ID}
            defaultValue={params.payment_token ?? ""}
            placeholder="tok_xxxx"
          />
        </FormField>
      </div>
    </div>
  );
}
