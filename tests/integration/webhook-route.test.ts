import { describe, expect, test } from "bun:test";
import { createHmac } from "crypto";
import { NextRequest } from "next/server";

function signPolarWebhook(params: { secret: string; body: string }): string {
  return createHmac("sha256", params.secret).update(params.body).digest("hex");
}

describe("payment webhook route", () => {
  test("accepts Polar webhook with valid signature", async () => {
    process.env.POLAR_API_KEY = "test_api_key";
    process.env.POLAR_WEBHOOK_SECRET = "test_webhook_secret";

    const { POST } = await import("../../app/api/webhooks/payment/route");
    const { GET } = await import("../../app/api/pipeline/sessions/route");

    const payload = {
      id: "evt_polar_001",
      type: "order.created",
      created: 1738972800,
      data: {
        metadata: {
          session_id: "sess_demo_001",
        },
      },
    };

    const body = JSON.stringify(payload);
    const signature = signPolarWebhook({
      secret: process.env.POLAR_WEBHOOK_SECRET,
      body,
    });

    const buildRequest = () =>
      new NextRequest(
        "http://localhost:3000/api/webhooks/payment?handler=polar",
        {
          method: "POST",
          headers: {
            "polar-signature": signature,
            "content-type": "application/json",
          },
          body,
        }
      );

    const response = await POST(buildRequest());
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.event).toBe(payload.id);

    const duplicateResponse = await POST(buildRequest());
    expect(duplicateResponse.status).toBe(200);

    const duplicateJson = await duplicateResponse.json();
    expect(duplicateJson.success).toBe(true);
    expect(duplicateJson.duplicate).toBe(true);

    const sessionsResponse = await GET(
      new NextRequest("http://localhost:3000/api/pipeline/sessions")
    );
    expect(sessionsResponse.status).toBe(200);

    const sessionsJson = await sessionsResponse.json();
    const sessions = (sessionsJson.sessions ?? []) as Array<{
      session_id: string;
      events: Array<{ step: string }>;
    }>;

    const session = sessions.find(
      (item) => item.session_id === "sess_demo_001"
    );
    expect(session).toBeDefined();

    const verifiedCount = session?.events.filter(
      (event) => event.step === "webhook_verified"
    ).length ?? 0;
    const receivedCount = session?.events.filter(
      (event) => event.step === "webhook_received"
    ).length ?? 0;

    expect(verifiedCount).toBe(2);
    expect(receivedCount).toBe(1);
  });
});
