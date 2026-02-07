"use client";

import {
  submitAddressAction,
  submitBuyerAction,
  submitCheckoutAction,
  submitPaymentAction,
  type FormState,
} from "@/app/actions";
import { FormSection } from "@/components/checkout/form-section";
import {
  AddressForm,
  BILLING_FORM_ID,
  BUYER_FORM_ID,
  BuyerForm,
  PAYMENT_FORM_ID,
  PaymentForm,
  SHIPPING_FORM_ID,
} from "@/components/forms";
import { TemplateSelector } from "@/components/template-selector";
import {
  DEFAULT_LOCALE,
  prefixPath,
  SUPPORTED_LOCALES,
  type Locale,
} from "@/lib/i18n";
import { allParsers, serializeCheckout } from "@repo/entities";
import { Button, Separator } from "@repo/ui";
import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useActionState } from "react";
import styles from "./checkout-client.module.css";

const CHECKOUT_FORM_ID = "checkout-form";
const checkoutInitial: FormState = { success: false };

export function CheckoutClient() {
  const [params] = useQueryStates(allParsers, { shallow: false });
  const [, checkoutAction, isCheckoutPending] = useActionState(
    submitCheckoutAction,
    checkoutInitial,
  );
  const rawLocale = useLocale();
  const locale = SUPPORTED_LOCALES.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : DEFAULT_LOCALE;
  const t = useTranslations("checkoutClient");
  const section = useTranslations("checkoutSections");

  // Generate the shareable URL
  const shareableUrl = prefixPath({
    locale,
    path: serializeCheckout("/checkout", params),
  });

  return (
    <div className={styles.stack}>
      {/* Template Selector for quick autofill */}
      <TemplateSelector />

      <Separator />

      {/* Buyer Information */}
      <FormSection
        formId={BUYER_FORM_ID}
        title={section("buyerTitle")}
        description={section("buyerDescription")}
        action={submitBuyerAction}
      >
        <BuyerForm />
      </FormSection>

      {/* Billing Address */}
      <FormSection
        formId={BILLING_FORM_ID}
        title={section("billingTitle")}
        description={section("billingDescription")}
        action={submitAddressAction}
      >
        <AddressForm type="billing" />
      </FormSection>

      {/* Shipping Address */}
      <FormSection
        formId={SHIPPING_FORM_ID}
        title={section("shippingTitle")}
        description={section("shippingDescription")}
        action={submitAddressAction}
      >
        <AddressForm type="shipping" />
      </FormSection>

      {/* Payment */}
      <FormSection
        formId={PAYMENT_FORM_ID}
        title={section("paymentTitle")}
        description={section("paymentDescription")}
        action={submitPaymentAction}
      >
        <PaymentForm />
      </FormSection>

      <Separator />

      {/* URL State Preview */}
      <div className={styles.urlPreview}>
        <p className={styles.urlLabel}>{t("urlLabel")}</p>
        <code className={styles.urlValue}>{shareableUrl || t("urlEmpty")}</code>
      </div>

      {/* Full Checkout Submit */}
      <form id={CHECKOUT_FORM_ID} action={checkoutAction} />
      <div className={styles.checkoutAction}>
        <Button
          type="submit"
          form={CHECKOUT_FORM_ID}
          size="lg"
          disabled={isCheckoutPending}
        >
          {isCheckoutPending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </div>
  );
}
