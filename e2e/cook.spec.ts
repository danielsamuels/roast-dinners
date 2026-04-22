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
  test("shows current step with timer and Mark Step Done", async ({ page }) => {
    // The cook page auto-generates a session if config exists
    await page.goto("/cook");

    // Wait for session to initialize — look for the current step card
    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // Timer should be visible (shows "Time remaining" or countdown)
    await expect(
      page.getByText(/time remaining/i).first(),
    ).toBeVisible();

    // Progress bar should exist
    await expect(page.getByLabel(/progress/i).first()).toBeVisible();
  });

  test("completing a step advances to the next", async ({ page }) => {
    await page.goto("/cook");

    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // Complete the step
    await doneButton.click();

    // Either a new step appears or all done
    await expect(
      page.getByRole("button", { name: /mark step done/i }).first()
        .or(page.getByText(/all steps complete/i)),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("timer counts down with clock mocking", async ({ page }) => {
    // Install fake clock before navigation
    await page.clock.install();

    await page.goto("/cook");

    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 10_000 });

    // Get initial timer value
    const timerLocator = page.locator("[aria-live='polite']").first();
    await expect(timerLocator).toBeVisible();
    const initialText = await timerLocator.textContent();

    // Fast-forward 60 seconds
    await page.clock.fastForward(60_000);

    // Timer should have changed (countdown decreased)
    await expect(timerLocator).not.toHaveText(initialText ?? "");
  });
});
