import { createShopifyStorefrontClient, getShopifyEnv } from "@repo/shopify";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const handle = req.nextUrl.searchParams.get("handle");
    if (!handle) {
      return NextResponse.json(
        { error: "Missing required handle query param" },
        { status: 400 }
      );
    }

    const env = getShopifyEnv();
    const client = createShopifyStorefrontClient({
      storeDomain: env.storeDomain,
      storefrontToken: env.storefrontToken,
      apiVersion: env.apiVersion,
    });

    const product = await client.fetchProductByHandle({ handle });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
