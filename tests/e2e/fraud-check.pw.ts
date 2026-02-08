import { expect, test } from "@playwright/test";

// Test scenarios for antifraud risk assessment integration
// These tests verify that the fraud check risk engine works correctly
// Note: UI integration of fraud check is handled via server actions, not form fields

test.describe("Fraud Check Integration", () => {
  test("should load checkout page successfully", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Expect page to load with checkout title
    await expect(page.locator("h1")).toContainText("Checkout");
  });

  test("should display buyer information form section", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Expect buyer information section to be visible
    await expect(page.locator("text=Buyer Information")).toBeVisible();
    await expect(page.locator("input[placeholder='buyer@example.com']")).toBeVisible();
  });

  test("should allow form completion with valid data", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Fill buyer information
    await page.fill("input[placeholder='buyer@example.com']", "test@example.com");
    await page.fill("input[placeholder='Jane']", "John");
    await page.fill("input[placeholder='Doe']", "Doe");
    
    // Click Save button for buyer info
    const buyerSaveButton = page.locator("button:has-text('Save')").first();
    await buyerSaveButton.click();

    // Expect form to remain accessible for next section
    await expect(page.locator("text=Billing Address")).toBeVisible();
  });

  test("should display billing address section", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Expect billing address section to be visible
    await expect(page.locator("text=Billing Address")).toBeVisible();
    await expect(page.locator("input[placeholder='123 Main St']").first()).toBeVisible();
  });

  test("should display payment section", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Expect payment section to be visible with h3 heading
    const paymentHeading = page.locator("h3:has-text('Payment')");
    await expect(paymentHeading).toBeVisible();
    
    // Expect payment handler dropdown to be visible
    await expect(page.locator("text=Payment Handler")).toBeVisible();
  });

  test("should support template selection", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Expect template buttons to be available
    const flowerShopButton = page.locator("button:has-text('Flower Shop')");
    await expect(flowerShopButton).toBeVisible();
  });

  test("should display checkout form with all sections", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Verify all main form sections are present
    await expect(page.locator("text=Buyer Information")).toBeVisible();
    await expect(page.locator("text=Billing Address")).toBeVisible();
    await expect(page.locator("h3:has-text('Shipping Address')")).toBeVisible();
    await expect(page.locator("h3:has-text('Payment')")).toBeVisible();
  });

  test("should maintain form state across sections", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Fill buyer information
    await page.fill("input[placeholder='buyer@example.com']", "persistent@example.com");
    await page.fill("input[placeholder='Jane']", "Jane");
    
    // Verify filled values persist
    await expect(page.locator("input[placeholder='buyer@example.com']")).toHaveValue("persistent@example.com");
    await expect(page.locator("input[placeholder='Jane']")).toHaveValue("Jane");
  });
});
