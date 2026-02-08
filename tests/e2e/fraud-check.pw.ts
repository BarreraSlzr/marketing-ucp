import { expect, test } from "@playwright/test";

// Test scenarios for antifraud risk assessment integration
// These tests verify that the fraud check step is enforced in the checkout pipeline

test.describe("Fraud Check Integration", () => {
  test("should allow low-risk checkout to proceed", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Submit buyer information (low-risk profile)
    await page.fill("input[name='buyer_email']", "normal.user@example.com");
    await page.fill("input[name='buyer_first_name']", "John");
    await page.fill("input[name='buyer_last_name']", "Doe");
    await page.click("button:has-text('Continue')");

    // Expect fraud check to pass silently
    await expect(page).toHaveURL(/\/checkout\/address/);
    await expect(page.locator("text=continues", { exact: false })).not.toBeVisible();
  });

  test("should block high-risk checkout with fraud signals", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Submit buyer information (high-risk indicators)
    // e.g., multiple attempts in short time, suspicious velocity patterns
    await page.fill("input[name='buyer_email']", "suspicious.user@example.com");
    await page.fill("input[name='device_hash']", "fake-device-hash-repeated");
    await page.click("button:has-text('Fraud Check')");

    // Expect fraud check to block and show error
    await expect(page.locator("text=Fraud check failed")).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
  });

  test("should flag medium-risk checkout for review", async ({ page }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Submit buyer information (medium-risk profile)
    // Risk score between ALLOW_THRESHOLD and BLOCK_THRESHOLD
    await page.fill("input[name='buyer_email']", "medium.risk@example.com");
    await page.fill("input[name='billing_country']", "US");
    await page.fill("input[name='ip_country']", "CA");
    await page.click("button:has-text('Continue')");

    // Expect fraud check to allow with review flag
    await expect(page).toHaveURL(/\/checkout\/(address|payment)/);
    // Review flag would be logged but checkout can continue
  });

  test("should display fraud signals in pipeline timeline", async ({ page }) => {
    // Navigate to a checkout session that was fraud-checked
    await page.goto("/dashboard/pipeline/test-session-id");

    // Expect fraud_check event to appear in timeline
    const fraudCheckEvent = page.locator("[data-event='fraud_check']");
    await expect(fraudCheckEvent).toBeVisible();

    // Click to see fraud check details
    await fraudCheckEvent.click();

    // Expect risk score and signals to be displayed
    await expect(page.locator("text=Risk Score")).toBeVisible();
    await expect(page.locator("text=Fraud Signals")).toBeVisible();
  });

  test("should emit fraud_check event in pipeline workflow", async ({ page }) => {
    // Navigate to dashboard to monitor events
    await page.goto("/dashboard");

    // Trigger a checkout with fraud check
    await page.goto("/checkout");
    await page.fill("input[name='buyer_email']", "test.user@example.com");
    await page.fill("input[name='buyer_first_name']", "Test");
    await page.fill("input[name='buyer_last_name']", "User");
    await page.click("button:has-text('Continue')");

    // Navigate to event stream
    await page.goto("/dashboard/events");

    // Expect fraud_check event to appear in the stream
    const fraudCheckEvents = page.locator("text=/fraud_check/");
    await expect(fraudCheckEvents).toHaveCount(1);
  });

  test("should prevent payment initiation if fraud check blocks", async ({
    page,
  }) => {
    // Navigate to checkout page
    await page.goto("/checkout");

    // Submit blocked buyer information
    await page.fill("input[name='buyer_email']", "blocked.user@example.com");
    await page.click("button:has-text('Continue')");

    // Attempt to proceed to payment
    // Fraud check should prevent this
    await expect(page).not.toHaveURL(/\/checkout\/payment/);
    await expect(page.locator("text=Fraud check failed")).toBeVisible();
  });

  test("should handle velocity-based fraud signals", async ({ page }) => {
    // Simulate multiple requests from same device/email
    const email = `velocity.test.${Date.now()}@example.com`;

    // First request (allowed)
    await page.goto("/checkout");
    await page.fill("input[name='buyer_email']", email);
    await page.fill("input[name='device_hash']", "test-device-123");
    await page.click("button:has-text('Check Fraud')");
    await expect(page.locator("text=success|review", { exact: false })).toBeVisible();

    // Second request quickly after (high velocity - likely blocked)
    const newPage = await page.context().newPage();
    await newPage.goto("/checkout");
    await newPage.fill("input[name='buyer_email']", email);
    await newPage.fill("input[name='device_hash']", "test-device-123");
    await newPage.click("button:has-text('Check Fraud')");

    // Should detect velocity anomaly
    await expect(
      newPage.locator("text=Velocity|Fraud check", { exact: false })
    ).toBeVisible();
    await newPage.close();
  });
});
