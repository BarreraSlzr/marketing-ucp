import {
    PolarCheckoutInputSchema,
    createPolarClient,
    getPolarEnv,
    type PolarCheckoutInput,
    type PolarClient,
} from "@repo/polar";
import { NextRequest, NextResponse } from "next/server";

export async function createPolarCheckoutSession(params: {
  client: PolarClient;
  input: PolarCheckoutInput;
}) {
  const input = PolarCheckoutInputSchema.parse(params.input);
  return params.client.createCheckoutSession({ input });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const input = PolarCheckoutInputSchema.parse(body);

    const env = getPolarEnv();
    const client = createPolarClient({
      apiKey: env.apiKey,
      baseUrl: env.baseUrl,
    });

    const session = await createPolarCheckoutSession({ client, input });
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 }
    );
  }
}
