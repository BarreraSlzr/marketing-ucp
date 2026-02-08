"use server";

import { getSharedVelocityStore } from "@/lib/antifraud-velocity-store";
import {
  getGlobalTracker,
  getSharedPipelineStorage,
  registerSessionId,
} from "@/lib/pipeline-tracker";
import { generateStamp } from "@/utils/stamp";
import { assessRisk } from "@repo/antifraud";
import { serializeCheckout } from "@repo/entities";
import { BuyerSchema } from "@repo/entities/buyer.zod";
import { PostalAddressSchema } from "@repo/entities/postal-address.zod";
import {
  getPipelineDefinition,
  PipelineEmitter,
  PipelineTypeSchema,
  SESSION_ID_MAX_LENGTH,
  tracedStep,
  type PipelineType
} from "@repo/pipeline";
import { Effect } from "effect";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

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

type PipelineContext = {
  session_id: string;
  pipeline_type: PipelineType;
};

function buildSharedEmitter(): PipelineEmitter {
  return new PipelineEmitter({ storage: getSharedPipelineStorage() });
}

function normalizeSessionId(params: { value: string }): string {
  const sanitized = params.value
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  const clipped = sanitized.slice(0, SESSION_ID_MAX_LENGTH);
  return clipped.length > 0 ? clipped : "session";
}

function resolvePipelineType(params: { raw: Record<string, string> }): PipelineType {
  const explicit = params.raw.checkout_pipeline_type;
  if (explicit) {
    const parsed = PipelineTypeSchema.safeParse(explicit);
    if (parsed.success) {
      return parsed.data;
    }
  }

  const hasAddress = Boolean(
    params.raw._address_type ||
      params.raw.shipping_line1 ||
      params.raw.billing_line1
  );

  return hasAddress ? "checkout_physical" : "checkout_digital";
}

function resolvePipelineContext(params: { raw: Record<string, string> }): PipelineContext {
  const sessionCandidate = params.raw.checkout_id ?? generateStamp();
  return {
    session_id: normalizeSessionId({ value: sessionCandidate }),
    pipeline_type: resolvePipelineType({ raw: params.raw }),
  };
}

export type FormState = {
  success: boolean;
  errors?: Record<string, string[]>;
  message?: string;
};

export type CheckoutRedirectParams = {
  basePath: string;
  formData: FormData;
};

export async function buildCheckoutRedirectUrl(
  params: CheckoutRedirectParams
): Promise<string> {
  const raw = formDataToObject(params.formData);

  return serializeCheckout(params.basePath, {
    buyer_email: raw.buyer_email || null,
    buyer_first_name: raw.buyer_first_name || null,
    buyer_last_name: raw.buyer_last_name || null,
    checkout_status: "ready_for_complete",
    checkout_currency: raw.checkout_currency || "USD",
  });
}

/* ── Buyer Form Action ───────────────────────────────────── */
export async function submitBuyerAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const pipelineContext = resolvePipelineContext({ raw });
  registerSessionId(pipelineContext.session_id);
  const emitter = buildSharedEmitter();

  const input = {
    email: raw.buyer_email,
    phone: raw.buyer_phone || undefined,
    first_name: raw.buyer_first_name || undefined,
    last_name: raw.buyer_last_name || undefined,
    customer_id: raw.buyer_customer_id || undefined,
  };

  const validationEffect = Effect.flatMap(
    Effect.sync(() =>
      BuyerSchema.pick({
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        customer_id: true,
      }).safeParse(input)
    ),
    (result) => (result.success ? Effect.succeed(result.data) : Effect.fail(result.error))
  );

  const traced = tracedStep({
    session_id: pipelineContext.session_id,
    pipeline_type: pipelineContext.pipeline_type,
    step: "buyer_validated",
    handler: "zod",
    input,
    effect: validationEffect,
    emitter,
  });

  const outcome = await Effect.runPromise(Effect.either(traced));

  if (outcome._tag === "Left") {
    const error = outcome.left;
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
        message: "Please fix the errors below.",
      };
    }

    return {
      success: false,
      message: "Unable to validate buyer information.",
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
  const pipelineContext = resolvePipelineContext({ raw });
  registerSessionId(pipelineContext.session_id);
  const emitter = buildSharedEmitter();

  const input = {
    line1: raw[`${prefix}_line1`],
    line2: raw[`${prefix}_line2`] || undefined,
    city: raw[`${prefix}_city`],
    state: raw[`${prefix}_state`] || undefined,
    postal_code: raw[`${prefix}_postal_code`],
    country: raw[`${prefix}_country`],
  };

  const validationEffect = Effect.flatMap(
    Effect.sync(() => PostalAddressSchema.safeParse(input)),
    (result) => (result.success ? Effect.succeed(result.data) : Effect.fail(result.error))
  );

  const traced = tracedStep({
    session_id: pipelineContext.session_id,
    pipeline_type: pipelineContext.pipeline_type,
    step: "address_validated",
    handler: "zod",
    input,
    effect: validationEffect,
    emitter,
  });

  const outcome = await Effect.runPromise(Effect.either(traced));

  if (outcome._tag === "Left") {
    const error = outcome.left;
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.flatten().fieldErrors as Record<string, string[]>,
        message: "Please fix the address errors below.",
      };
    }

    return {
      success: false,
      message: "Unable to validate the address.",
    };
  }

  return {
    success: true,
    message: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)} address saved.`,
  };
}

/* ── Fraud Check Action ──────────────────────────────────── */
export async function submitFraudCheckAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const pipelineContext = resolvePipelineContext({ raw });
  registerSessionId(pipelineContext.session_id);
  const emitter = buildSharedEmitter();

  const tracker = getGlobalTracker();
  const events = await tracker.getEvents({
    session_id: pipelineContext.session_id,
  });
  const definition = getPipelineDefinition({
    type: pipelineContext.pipeline_type,
  });

  const currentChecksum = definition
    ? await tracker.getCurrentChecksum({
        session_id: pipelineContext.session_id,
        definition,
      })
    : null;

  const latestSnapshot = definition
    ? await tracker.getLatestSnapshot({
        session_id: pipelineContext.session_id,
      })
    : null;

  // Build assessment input from form data
  const assessmentInput = {
    session_id: pipelineContext.session_id,
    events,
    email: raw.buyer_email,
    ip: raw.client_ip,
    device_hash: raw.device_hash,
    billing_country: raw.billing_country,
    ip_country: raw.ip_country,
    previous_chain_hash: latestSnapshot?.chain_hash ?? undefined,
    current_chain_hash: currentChecksum?.chain_hash ?? undefined,
  };

  // Create an Effect that performs the risk assessment
  const fraudCheckEffect = Effect.tryPromise({
    try: async () => {
      const assessment = await assessRisk({
        input: assessmentInput,
        config: {
          velocityStore: getSharedVelocityStore(),
        },
      });

      // If blocked, return error to halt pipeline
      if (assessment.decision === "block") {
        const signals = assessment.signals
          .map((s) => `${s.name} (${s.score})`)
          .join(", ");
        throw new Error(
          `Fraud check failed: ${assessment.decision.toUpperCase()}. Signals: ${signals}`
        );
      }

      return assessment;
    },
    catch: (error) => error as Error,
  });

  const traced = tracedStep({
    session_id: pipelineContext.session_id,
    pipeline_type: pipelineContext.pipeline_type,
    step: "fraud_check",
    handler: "antifraud",
    input: assessmentInput,
    effect: fraudCheckEffect,
    emitter,
  });

  const outcome = await Effect.runPromise(Effect.either(traced));

  if (outcome._tag === "Left") {
    const error = outcome.left;
    return {
      success: false,
      message: error.message || "Fraud check failed. Please contact support.",
    };
  }

  // If decision is "review", optionally flag for manual review
  // For now, we treat review as allowing the checkout to proceed
  const assessment = outcome.right;
  if (assessment.decision === "review") {
    console.warn(
      `[FRAUD-REVIEW] Session ${pipelineContext.session_id} requires manual review. Score: ${assessment.total_score}`
    );
  }

  return {
    success: true,
    message: `Fraud check completed (decision: ${assessment.decision}).`,
  };
}

/* ── Payment Form Action ──────────────────────────────────── */
export async function submitPaymentAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const raw = formDataToObject(formData);
  const pipelineContext = resolvePipelineContext({ raw });

  const validationEffect = raw.payment_handler
    ? Effect.succeed(raw.payment_handler)
    : Effect.fail(new Error("Payment handler is required."));

  const traced = tracedStep({
    session_id: pipelineContext.session_id,
    pipeline_type: pipelineContext.pipeline_type,
    step: "payment_initiated",
    handler: "form",
    input: { payment_handler: raw.payment_handler },
    effect: validationEffect,
  });

  const outcome = await Effect.runPromise(Effect.either(traced));

  if (outcome._tag === "Left") {
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
  const pipelineContext = resolvePipelineContext({ raw });

  // Build the URL state from all submitted form sections
  const url = await Effect.runPromise(
    tracedStep({
      session_id: pipelineContext.session_id,
      pipeline_type: pipelineContext.pipeline_type,
      step: "checkout_completed",
      handler: "redirect",
      input: { basePath: "/checkout/confirm" },
      effect: Effect.tryPromise({
        try: () =>
          buildCheckoutRedirectUrl({
            basePath: "/checkout/confirm",
            formData,
          }),
        catch: (error) => error as Error,
      }),
    })
  );

  redirect(url);
}
