import { expect, test } from "@playwright/test";

test("checkout demo updates URL state", async ({ page }) => {
  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "UCP Checkout" })).toBeVisible();

  await page.getByRole("button", { name: /Digital Product/ }).click();

  await expect(page.getByText("Current URL State")).toBeVisible();
  await expect(page.locator("code").first()).toContainText(
    "buyer_email=developer@company.io"
  );
});

test("homepage routes to dashboard and forms", async ({ page }) => {
  await page.goto("/");

  await page.locator("nav").getByRole("link", { name: "Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "UCP Observability Dashboard" })).toBeVisible();

  await page.goto("/");
  await page.locator("nav").getByRole("link", { name: "Try It" }).click();
  await expect(page.getByRole("heading", { name: "UCP Checkout" })).toBeVisible();
});
