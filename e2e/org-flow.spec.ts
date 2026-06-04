import { test, expect } from "@playwright/test";

test.describe("Organization Management Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
  });

  test("sign in → create org → invite member", async ({ page }) => {
    // Step 1: Sign In
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "Admin1234");
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard\/organizations/);
    await expect(page.locator("h1")).toContainText("Organizations");

    // Step 2: Create Organization
    await page.click("text=New Organization");
    await page.fill('input[placeholder="Acme Corp"]', "E2E Test School");

    // Select type
    await page.click('[role="combobox"]');
    await page.click("text=School");

    // Fill school district
    await page.fill('input[placeholder*="Springfield"]', "Test District");

    // Submit
    await page.click('button:has-text("Create Organization")');

    // Verify org appears
    await expect(page.locator("text=E2E Test School")).toBeVisible({ timeout: 5000 });

    // Step 3: Navigate to org detail
    await page.click("text=E2E Test School");
    await expect(page).toHaveURL(/\/dashboard\/organizations\/.+/);

    // Step 4: Invite Member
    await page.fill('input[type="email"]', "testmember@example.com");
    await page.click('button:has-text("Send Invitation")');

    // Verify member appears
    await expect(page.locator("text=testmember@example.com")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=invited").first()).toBeVisible();
  });

  test("prevents duplicate invitations", async ({ page }) => {
    // Sign in
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "Admin1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard\/organizations/);

    // Navigate to first org
    const orgCard = page.locator('[role="button"]').first();
    await orgCard.click();
    await expect(page).toHaveURL(/\/dashboard\/organizations\/.+/);

    // Invite same email twice
    await page.fill('input[type="email"]', "duplicate@example.com");
    await page.click('button:has-text("Send Invitation")');

    // Wait for first invite to complete
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', "duplicate@example.com");
    await page.click('button:has-text("Send Invitation")');

    // Should show duplicate error
    await expect(page.locator("text=already been invited")).toBeVisible({ timeout: 5000 });
  });

  test("filters organizations by type", async ({ page }) => {
    // Sign in
    await page.fill('input[type="email"]', "admin@test.com");
    await page.fill('input[type="password"]', "Admin1234");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard\/organizations/);

    // Use type filter
    const typeSelect = page.locator('[role="combobox"]').first();
    await typeSelect.click();
    await page.click("text=School");

    // Verify filter applied
    await expect(page.locator("text=All types")).not.toBeVisible();
  });
});
