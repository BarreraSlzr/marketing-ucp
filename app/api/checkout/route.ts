import { generateStamp } from "@/utils/stamp";
import {
    CheckoutApiRequestSchema,
    CheckoutApiResponseSchema,
    LineItemSchema,
    serializeCheckout,
    type CheckoutApiRequest,
    type CheckoutApiResponse,
    type CheckoutLineItemInput,
    type LineItem,
    type Link,
    type Total,
} from "@repo/entities";
import { NextRequest, NextResponse } from "next/server";

const UCP_VERSION = "2025-01-01";
const UCP_CAPABILITIES = [
  { name: "com.ucp.checkout", version: UCP_VERSION },
  { name: "com.ucp.checkout.headless", version: UCP_VERSION },
];

function normalizeLineItems(params: {
  lineItems: CheckoutLineItemInput[];
}): LineItem[] {
  return params.lineItems.map((item) =>
    LineItemSchema.parse({
      ...item,
      total_price: item.total_price ?? item.unit_price * item.quantity,
    })
  );
}

function buildTotals(params: { lineItems: LineItem[] }): Total[] {
  const subtotal = params.lineItems.reduce(
    (sum, item) => sum + item.total_price,
    0
  );

  return [
    { type: "subtotal", label: "Subtotal", amount: subtotal },
    { type: "grand_total", label: "Total", amount: subtotal },
  ];
}

function buildLinks(params: { origin: string; links?: Link[] }): Link[] {
  if (params.links && params.links.length > 0) {
    return params.links;
  }

  return [
    {
      rel: "privacy_policy",
      href: `${params.origin}/privacy`,
      label: "Privacy Policy",
    },
    {
      rel: "terms_of_service",
      href: `${params.origin}/terms`,
      label: "Terms of Service",
    },
  ];
}

function buildCheckoutUrl(params: {
  basePath: string;
  origin: string;
  input: CheckoutApiRequest;
  lineItems: LineItem[];
  checkoutId: string;
}): string {
  const firstItem = params.lineItems[0];

  const relativeUrl = serializeCheckout(params.basePath, {
    checkout_id: params.checkoutId,
    checkout_status: "incomplete",
    checkout_currency: params.input.currency,
    buyer_email: params.input.buyer?.email ?? null,
    buyer_first_name: params.input.buyer?.first_name ?? null,
    buyer_last_name: params.input.buyer?.last_name ?? null,
    line_items: params.lineItems,
    item_id: firstItem?.id ?? null,
    item_name: firstItem?.name ?? null,
    item_quantity: firstItem?.quantity ?? null,
    item_unit_price: firstItem?.unit_price ?? null,
    item_sku: firstItem?.sku ?? null,
    item_image_url: firstItem?.image_url ?? null,
  });

  return new URL(relativeUrl, params.origin).toString();
}

export function buildCheckoutResponse(params: {
  input: CheckoutApiRequest;
  origin: string;
}): CheckoutApiResponse {
  const currency = params.input.currency.toUpperCase();
  const checkoutId = `chk_${generateStamp()}`;
  const lineItems = normalizeLineItems({ lineItems: params.input.line_items });
  const totals = buildTotals({ lineItems });
  const links = buildLinks({ origin: params.origin, links: params.input.links });

  const checkout = {
    id: checkoutId,
    line_items: lineItems,
    buyer: params.input.buyer,
    status: "incomplete" as const,
    currency,
    totals,
    links,
    ucp: {
      version: UCP_VERSION,
      capabilities: UCP_CAPABILITIES,
    },
  };

  const checkout_url = buildCheckoutUrl({
    basePath: "/checkout",
    origin: params.origin,
    input: {
      ...params.input,
      currency,
    },
    lineItems,
    checkoutId,
  });

  return CheckoutApiResponseSchema.parse({
    checkout,
    checkout_url,
    totals,
    ucp: checkout.ucp,
    locale: params.input.locale,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CheckoutApiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const response = buildCheckoutResponse({
      input: parsed.data,
      origin: req.nextUrl.origin,
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
