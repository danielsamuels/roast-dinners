import { test, expect } from "@playwright/test";
import { seedConfig, knownGoodConfig, unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
  await seedConfig(page, knownGoodConfig);
});

test.describe("Shopping page — seeded state", () => {
  test("renders ingredient categories", async ({ page }) => {
    await page.goto("/shopping");

    await expect(page.getByRole("heading", { name: /shopping list/i })).toBeVisible();
    // Should show at least one category section (e.g. Fresh Vegetables, Meat & Fish, etc.)
    // Categories are rendered as collapsible triggers
    const categoryButtons = page.locator("button").filter({ hasText: /item/ });
    await expect(categoryButtons.first()).toBeVisible();
  });

  test("checkbox toggling works", async ({ page }) => {
    await page.goto("/shopping");

    // Find the first checkbox and toggle it
    const firstCheckbox = page.getByRole("checkbox").first();
    await expect(firstCheckbox).toBeVisible();

    // Toggle on
    await firstCheckbox.click();
    // The checked count should update
    await expect(page.getByText(/1\/.*checked/i)).toBeVisible();

    // Toggle off
    await firstCheckbox.click();
    await expect(page.getByText(/0\/.*checked/i)).toBeVisible();
  });

  test("copy and share buttons exist", async ({ page }) => {
    await page.goto("/shopping");

    await expect(
      page.getByRole("button", { name: /copy list/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /share/i }),
    ).toBeVisible();
  });
});
