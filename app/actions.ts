"use server";

import { BuyerSchema } from "@repo/entities/buyer.zod";
import { PostalAddressSchema } from "@repo/entities/postal-address.zod";
import { redirect } from "next/navigation";
import { serializeCheckout } from "@repo/entities";

/**
 * Shared utility: extract FormData into a plain object,
 * filtering out empty strings so optional zod fields pass.
 */
function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && value !== "") {
      obj[key] = value;
    }
  });
  return obj;
}

export type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

/* ── Buyer Form Action ───────────────────────────────────── */
export async function submitBuyerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);

  const result = BuyerSchema.pick({
    email: true,
    phone: true,
    first_name: true,
    last_name: true,
    customer_id: true,
  }).safeParse({
    email: raw.buyer_email,
    phone: raw.buyer_phone || undefined,
    first_name: raw.buyer_first_name || undefined,
    last_name: raw.buyer_last_name || undefined,
    customer_id: raw.buyer_customer_id || undefined,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Please fix the errors below.",
    };
  }

  return {
    success: true,
    message: "Buyer information saved.",
  };
}

/* ── Address Form Action ─────────────────────────────────── */
export async function submitAddressAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const prefix = raw._address_type === "shipping" ? "shipping" : "billing";

  const result = PostalAddressSchema.safeParse({
    line1: raw[`${prefix}_line1`],
    line2: raw[`${prefix}_line2`] || undefined,
    city: raw[`${prefix}_city`],
    state: raw[`${prefix}_state`] || undefined,
    postal_code: raw[`${prefix}_postal_code`],
    country: raw[`${prefix}_country`],
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
      message: "Please fix the address errors below.",
    };
  }

  return {
    success: true,
    message: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} address saved.`,
  };
}

/* ── Payment Form Action ─────────────────────────────────── */
export async function submitPaymentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);

  if (!raw.payment_handler) {
    return {
      success: false,
      errors: { handler: ["Payment handler is required."] },
      message: "Please select a payment method.",
    };
  }

  return {
    success: true,
    message: "Payment information saved.",
  };
}

/* ── Product Create/Update Action ─────────────────────────── */
export async function submitProductAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);

  if (!raw.product_name) {
    return {
      success: false,
      errors: { name: ["Product name is required."] },
      message: "Please provide a product name.",
    };
  }

  const price = parseInt(raw.product_price || "0", 10);
  if (isNaN(price) || price < 0) {
    return {
      success: false,
      errors: { price: ["Price must be a non-negative number."] },
      message: "Invalid price.",
    };
  }

  // In a real implementation, this would persist to a database
  // or call an external API (Shopify, etc.)
  return {
    success: true,
    message: `Product "${raw.product_name}" saved successfully. Use the checkout link to test the purchase flow.`,
  };
}

/* ── Full Checkout Submit ────────────────────────────────── */
export async function submitCheckoutAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);

  // Build the URL state from all submitted form sections
  const url = serializeCheckout("/checkout/confirm", {
    buyer_email: raw.buyer_email || null,
    buyer_first_name: raw.buyer_first_name || null,
    buyer_last_name: raw.buyer_last_name || null,
    checkout_status: "ready_for_complete",
    checkout_currency: raw.checkout_currency || "USD",
  });

  redirect(url);
}
