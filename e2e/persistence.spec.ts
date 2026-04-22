import { test, expect } from "@playwright/test";
import { seedConfig, knownGoodConfig, unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
});

test.describe("Persistence — reload survival", () => {
  test("config persists after page reload", async ({ page }) => {
    await seedConfig(page, knownGoodConfig);
    await page.goto("/configure");

    // Verify the config is loaded: the badge for selected cut should show
    await expect(page.locator("[data-variant='secondary']").filter({ hasText: "Whole Roast Chicken" })).toBeVisible();

    // Reload the page
    await page.reload();

    // Config should still be there
    await expect(page.locator("[data-variant='secondary']").filter({ hasText: "Whole Roast Chicken" })).toBeVisible();
  });

  test("cooking day config persists after page reload", async ({ page }) => {
    await seedConfig(page, knownGoodConfig);
    await page.goto("/cooking-day");

    // Serving time should be 14:00
    const timeInput = page.getByLabel(/serving time/i);
    await expect(timeInput).toHaveValue("14:00");

    // Reload the page
    await page.reload();

    // Config should still be there
    await expect(page.getByLabel(/serving time/i)).toHaveValue("14:00");
  });
});
