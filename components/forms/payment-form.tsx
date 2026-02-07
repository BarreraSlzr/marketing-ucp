"use client";

import { paymentParsers } from "@repo/entities";
import { FormField, Input, NativeSelect } from "@repo/ui";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import styles from "./payment-form.module.css";

export const PAYMENT_FORM_ID = "payment-form";

const paymentHandlers = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "square", label: "Square" },
];

export function PaymentForm() {
  const [params] = useQueryStates(paymentParsers, { shallow: false });
  const t = useTranslations("forms.payment");
  const credentialOptions = [
    { value: "token", label: t("credentialToken") },
    { value: "card", label: t("credentialCard") },
  ];

  return (
    <div className={styles.grid}>
      <FormField name="payment_handler" label={t("handlerLabel")}>
        <NativeSelect
          id="payment_handler"
          name="payment_handler"
          form={PAYMENT_FORM_ID}
          defaultValue={params.payment_handler}
          options={paymentHandlers}
          placeholder={t("handlerPlaceholder")}
          required
        />
      </FormField>

      <div className={styles.row}>
        <FormField
          name="payment_credential_type"
          label={t("credentialTypeLabel")}
        >
          <NativeSelect
            id="payment_credential_type"
            name="payment_credential_type"
            form={PAYMENT_FORM_ID}
            defaultValue={params.payment_credential_type ?? ""}
            options={credentialOptions}
            placeholder={t("credentialTypePlaceholder")}
          />
        </FormField>

        <FormField name="payment_token" label={t("tokenLabel")}>
          <Input
            id="payment_token"
            name="payment_token"
            form={PAYMENT_FORM_ID}
            defaultValue={params.payment_token ?? ""}
            placeholder={t("tokenPlaceholder")}
          />
        </FormField>
      </div>
    </div>
  );
}
