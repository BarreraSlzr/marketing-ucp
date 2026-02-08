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

test("event stream replay demo seeds events", async ({ page }) => {
  await page.goto("/dashboard/events");

  const replayButton = page.getByRole("button", { name: "Replay demo" });
  await replayButton.click();

  await expect(page.getByText("Demo events generated")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh events" })).toBeEnabled();
});

test("event stream filters work", async ({ page }) => {
  await page.goto("/dashboard/events");

  await page.locator("#filter-token").fill("session:demo_physical_001");
  await page.getByRole("button", { name: "Add quick filter" }).click();

  const filterPill = page.getByRole("button", {
    name: /Remove Session demo_physical_001/,
  });
  await expect(filterPill).toBeVisible();

  await filterPill.click();
  await expect(filterPill).not.toBeVisible();
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
