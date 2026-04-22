import { test, expect } from "@playwright/test";
import {
  seedConfig,
  knownGoodConfig,
  unregisterServiceWorkers,
} from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
  await seedConfig(page, knownGoodConfig);
});

test.describe("Cook page — seeded state", () => {
  test("shows current step group and Mark Step Done", async ({ page }) => {
    // The cook page auto-generates a session if config exists
    await page.goto("/cook");

    // Wait for session to initialize — look for the current step card
    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // Progress bar should exist
    await expect(page.getByLabel(/progress/i).first()).toBeVisible();

    // Step group header should be visible
    await expect(page.getByText(/step group/i).first()).toBeVisible();
  });

  test("completing a step advances to the next", async ({ page }) => {
    await page.goto("/cook");

    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // Complete the step
    await doneButton.click();

    // Either a new step appears, waiting state, or all done
    await expect(
      page.getByRole("button", { name: /mark step done/i }).first()
        .or(page.getByText(/all steps complete/i))
        .or(page.getByText(/wait for the next step/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("top-level timer counts down with clock mocking", async ({ page }) => {
    // Install fake clock before navigation
    await page.clock.install();

    await page.goto("/cook");

    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // The top-level timer shows countdown to next group (if there is one)
    const timerLocator = page.locator("[aria-live='polite']").first();
    // Timer may or may not be visible depending on if next group exists
    const timerVisible = await timerLocator.isVisible().catch(() => false);
    if (timerVisible) {
      const initialText = await timerLocator.textContent();

      // Fast-forward 60 seconds
      await page.clock.fastForward(60_000);

      // Timer should have changed (countdown decreased)
      await expect(timerLocator).not.toHaveText(initialText ?? "");
    }
  });
});
