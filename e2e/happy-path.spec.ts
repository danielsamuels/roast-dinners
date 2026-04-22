import { test, expect } from "@playwright/test";
import { unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
});

test.describe("Happy path — full flow", () => {
  test("complete a meal plan from start to cook", async ({ page }) => {
    // ── Landing page ──
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /plan your roast dinner/i })).toBeVisible();

    // Continue to Configure
    await page.getByRole("button", { name: /start planning/i }).click();
    await expect(page).toHaveURL(/\/configure/);

    // ── Configure page ──
    await expect(page.getByRole("heading", { name: /configure your meal/i })).toBeVisible();

    // Select Chicken — expands cut selector since there are 2 chicken cuts
    await page.getByRole("button", { name: /chicken/i }).click();

    // Select "Whole Roast Chicken" cut
    await page.getByRole("button", { name: /whole roast chicken/i }).click();

    // Wait for cut badge to confirm selection
    await expect(page.locator("[data-variant='secondary']").filter({ hasText: "Whole Roast Chicken" })).toBeVisible();

    // Verify servings shows 4
    await expect(page.locator("span.text-3xl")).toHaveText("4");

    // Select a side — Roast Potatoes
    await page.getByRole("button", { name: /roast potatoes/i }).click();

    // Navigate to Shopping
    await page.getByRole("button", { name: /view shopping list/i }).click();
    await expect(page).toHaveURL(/\/shopping/);

    // ── Shopping page ──
    await expect(page.getByRole("heading", { name: /shopping list/i })).toBeVisible();
    // Verify ingredients appear (at least one category section should be visible)
    await expect(page.getByText(/item/i).first()).toBeVisible();

    // Navigate to Cooking Day
    await page.getByRole("button", { name: /review plan/i }).click();
    await expect(page).toHaveURL(/\/cooking-day/);

    // ── Cooking Day page ──
    await expect(page.getByRole("heading", { name: /cooking day/i })).toBeVisible();

    // Select 1 oven (already default, but click to be explicit)
    await page.getByRole("radio", { name: /1 oven/i }).click();
    await expect(page.getByRole("radio", { name: /1 oven/i })).toHaveAttribute("aria-checked", "true");

    // Set weight
    const weightInput = page.getByLabel(/joint weight/i);
    await expect(weightInput).toBeVisible();
    await weightInput.click();
    await weightInput.press("Control+a");
    await weightInput.pressSequentially("1.8");
    await weightInput.press("Tab");

    // Set serving time
    const timeInput = page.getByLabel(/serving time/i);
    await timeInput.fill("14:00");

    // Navigate to Review
    await page.getByRole("button", { name: /review plan/i }).click();
    await expect(page).toHaveURL(/\/review/, { timeout: 10_000 });

    // ── Review page ──
    await expect(page.getByRole("heading", { name: /review your plan/i })).toBeVisible();

    // Verify summary shows meat name and serving time
    await expect(page.getByText(/whole roast chicken/i).first()).toBeVisible();
    await expect(page.getByText("14:00").first()).toBeVisible();

    // Verify timeline has at least one step
    await expect(page.getByRole("heading", { name: /timeline/i })).toBeVisible();

    // Start Cooking — may show timing warning dialog if outside cooking window
    await page.getByRole("button", { name: /start cooking/i }).click();

    // If outside cooking window, the warning dialog appears — click "Start now"
    const startNow = page.getByRole("button", { name: /start now/i });
    if (await startNow.isVisible({ timeout: 1000 }).catch(() => false)) {
      await startNow.click();
    }

    await expect(page).toHaveURL(/\/cook/);

    // ── Cook page ──
    // Verify a current step card is visible (has a "Mark Step Done" button)
    const doneButton = page.getByRole("button", { name: /mark step done/i }).first();
    await expect(doneButton).toBeVisible();

    // Complete the first step
    await doneButton.click();

    // After completing, another step should be visible OR all steps done
    const nextDoneButton = page.getByRole("button", { name: /mark step done/i }).first();
    // Either another step shows up or completion message
    await expect(
      nextDoneButton.or(page.getByText(/all steps complete/i)),
    ).toBeVisible();
  });
});
