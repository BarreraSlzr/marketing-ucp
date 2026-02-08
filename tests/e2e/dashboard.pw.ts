import { expect, test } from "@playwright/test";

const seedEndpoint = "/api/pipeline/demo";

test.beforeAll(async ({ request }) => {
  const demoKey = process.env.DEMO_API_KEY ?? "";
  const response = await request.post(seedEndpoint, {
    headers: demoKey ? { "x-demo-key": demoKey } : undefined,
  });
  expect(response.ok()).toBeTruthy();
});

test("dashboard overview renders", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "UCP Observability Dashboard" })
  ).toBeVisible();
});

test("event stream renders", async ({ page }) => {
  await page.goto("/dashboard/events");
  await expect(page.getByRole("heading", { name: "Event Stream" })).toBeVisible();
  await expect(page.getByText("Pipeline event log")).toBeVisible();
});

test("handler health renders", async ({ page }) => {
  await page.goto("/dashboard/handlers");
  await expect(page.getByRole("heading", { name: "Handler Health" })).toBeVisible();
});

test("pipeline detail renders", async ({ page }) => {
  await page.goto("/dashboard/pipeline/demo_physical_001");
  await expect(
    page.getByRole("heading", { name: "demo_physical_001" })
  ).toBeVisible();
  await expect(page.getByText("Step timeline")).toBeVisible();
});
