"use client";

import { useActionState } from "react";
import { useQueryStates } from "nuqs";
import { allParsers, serializeCheckout } from "@repo/entities";
import { Button, Separator } from "@repo/ui";
import { FormSection } from "@/components/checkout/form-section";
import {
  BuyerForm,
  BUYER_FORM_ID,
  AddressForm,
  BILLING_FORM_ID,
  SHIPPING_FORM_ID,
  PaymentForm,
  PAYMENT_FORM_ID,
} from "@/components/forms";
import {
  submitBuyerAction,
  submitAddressAction,
  submitPaymentAction,
  submitCheckoutAction,
  type FormState,
} from "@/app/actions";
import { TemplateSelector } from "@/components/template-selector";
import styles from "./checkout-client.module.css";

const CHECKOUT_FORM_ID = "checkout-form";
const checkoutInitial: FormState = { success: false };

export function CheckoutClient() {
  const [params] = useQueryStates(allParsers, { shallow: false });
  const [checkoutState, checkoutAction, isCheckoutPending] = useActionState(submitCheckoutAction, checkoutInitial);

  // Generate the shareable URL
  const shareableUrl = serializeCheckout("", params);

  return (
    <div className={styles.stack}>
      {/* Template Selector for quick autofill */}
      <TemplateSelector />

      <Separator />

      {/* Buyer Information */}
      <FormSection
        formId={BUYER_FORM_ID}
        title="Buyer Information"
        description="Contact details for the buyer"
        action={submitBuyerAction}
      >
        <BuyerForm />
      </FormSection>

      {/* Billing Address */}
      <FormSection
        formId={BILLING_FORM_ID}
        title="Billing Address"
        description="Where the invoice is sent"
        action={submitAddressAction}
      >
        <AddressForm type="billing" />
      </FormSection>

      {/* Shipping Address */}
      <FormSection
        formId={SHIPPING_FORM_ID}
        title="Shipping Address"
        description="Where the order will be delivered"
        action={submitAddressAction}
      >
        <AddressForm type="shipping" />
      </FormSection>

      {/* Payment */}
      <FormSection
        formId={PAYMENT_FORM_ID}
        title="Payment"
        description="Payment method and credentials"
        action={submitPaymentAction}
      >
        <PaymentForm />
      </FormSection>

      <Separator />

      {/* URL State Preview */}
      <div className={styles.urlPreview}>
        <p className={styles.urlLabel}>Current URL State</p>
        <code className={styles.urlValue}>
          {shareableUrl || "(empty -- fill in fields above)"}
        </code>
      </div>

      {/* Full Checkout Submit */}
      <form id={CHECKOUT_FORM_ID} action={checkoutAction} />
      <div className={styles.checkoutAction}>
        <Button type="submit" form={CHECKOUT_FORM_ID} size="lg" disabled={isCheckoutPending}>
          {isCheckoutPending ? "Processing..." : "Complete Checkout"}
        </Button>
      </div>
    </div>
  );
}
