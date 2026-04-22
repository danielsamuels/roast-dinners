import { test, expect } from "@playwright/test";
import { unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
});

test.describe("Route guards — direct URL visits without config", () => {
  test("visiting /review without config shows fallback", async ({ page }) => {
    await page.goto("/review");

    // Should show diagnostic message about what's missing
    await expect(
      page.getByText(/please select a meat cut/i),
    ).toBeVisible();
  });

  test("visiting /cook without config shows fallback", async ({ page }) => {
    await page.goto("/cook");

    // Should show diagnostic message or "starting cooking session"
    await expect(
      page.getByText(/please complete the cooking day setup/i)
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
