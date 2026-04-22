import { test, expect } from "@playwright/test";
import { seedConfig, knownGoodConfig, unregisterServiceWorkers } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await unregisterServiceWorkers(page);
  await seedConfig(page, knownGoodConfig);
});

test.describe("Review page — seeded state", () => {
  test("summary card shows meat name, servings, and serving time", async ({ page }) => {
    await page.goto("/review");

    await expect(page.getByRole("heading", { name: /review your plan/i })).toBeVisible();

    // Summary card: meat name (use the dd element in the summary card)
    await expect(page.getByText("Whole Roast Chicken (1.8kg)")).toBeVisible();
    // Summary card: servings
    await expect(page.getByText(/4 people/i)).toBeVisible();
    // Summary card: serving time
    await expect(page.getByText("14:00").first()).toBeVisible();
  });

  test("timeline has step entries", async ({ page }) => {
    await page.goto("/review");

    // The timeline section should have numbered step groups
    await expect(page.getByRole("heading", { name: /timeline/i })).toBeVisible();
    // Each step shows a summary and duration badge — look for any duration badge
    await expect(page.getByText(/min/i).first()).toBeVisible();
  });

  test("equipment checklist renders", async ({ page }) => {
    await page.goto("/review");

    // Equipment checklist should be present and have at least one item
    await expect(page.getByText(/equipment checklist/i)).toBeVisible();
    const equipmentCheckboxes = page.getByRole("checkbox");
    await expect(equipmentCheckboxes.first()).toBeVisible();
  });
});
