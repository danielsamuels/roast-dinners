import { test, expect } from "@playwright/test";
import { unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
});

test.describe("Route guards — direct URL visits without config", () => {
  test("visiting /review without config shows fallback", async ({ page }) => {
    await page.goto("/review");

    // Should show "configure your meal first" message
    await expect(
      page.getByText(/configure your meal first/i),
    ).toBeVisible();
  });

  test("visiting /cook without config shows fallback", async ({ page }) => {
    await page.goto("/cook");

    // Should show "configure your meal first" or "starting cooking session"
    await expect(
      page.getByText(/configure your meal first/i)
        .or(page.getByText(/starting cooking session/i).first()),
    ).toBeVisible();
  });

  test("visiting /shopping without config shows empty state", async ({ page }) => {
    await page.goto("/shopping");

    // Should show "No items to show" empty state
    await expect(
      page.getByText("No items to show."),
    ).toBeVisible();
  });
});
