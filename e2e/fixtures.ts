import type { Page } from "@playwright/test";

/**
 * MealConfigState shape matching src/hooks/useMealConfig.tsx
 */
export interface MealConfigState {
  ovenCavities: number;
  meatCutId: string | null;
  doneness: string | null;
  servings: number;
  actualWeightKg: number | null;
  servingTime: string;
  sides: Array<{ sideId: string; mode: string; variantId?: string }>;
  condiments: string[];
  gravy: { sideId: string; mode: string } | null;
  ovenTempDisplay: string;
  prepAheadSteps: string[];
  checkedShoppingItems: string[];
}

export const STORAGE_KEY = "roast-dinner-config";
export const SESSION_STORAGE_KEY = "roast-dinner-cooking-session";

/**
 * A known-good config that will produce a valid schedule.
 * Uses chicken-whole with roast potatoes side.
 */
export const knownGoodConfig: MealConfigState = {
  ovenCavities: 1,
  meatCutId: "chicken-whole",
  doneness: null,
  servings: 4,
  actualWeightKg: 1.8,
  servingTime: "14:00",
  sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
  condiments: [],
  gravy: { sideId: "gravy", mode: "premade" },
  ovenTempDisplay: "celsius-fan",
  prepAheadSteps: [],
  checkedShoppingItems: [],
};

/**
 * Seed MealConfig into localStorage before navigating.
 * Must be called before page.goto() — use a blank page first.
 */
export async function seedConfig(
  page: Page,
  config: MealConfigState = knownGoodConfig,
) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: STORAGE_KEY, value: JSON.stringify(config) },
  );
}

/**
 * StoredSession shape matching src/hooks/useCookingSession.ts
 */
export interface StoredSession {
  isActive: boolean;
  startedAt: string | null;
  scheduleJson: string | null;
  completedStepIds: string[];
  skippedDishIds: string[];
  lateOffsetMinutes: number;
}

/**
 * Seed a cooking session into localStorage before navigating.
 */
export async function seedCookingSession(
  page: Page,
  session: StoredSession,
) {
  await page.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      localStorage.setItem(key, value);
    },
    { key: SESSION_STORAGE_KEY, value: JSON.stringify(session) },
  );
}

/**
 * Unregister any service workers to prevent interference with tests.
 */
export async function unregisterServiceWorkers(page: Page) {
  await page.addInitScript(() => {
    // Prevent SW registration during tests
    if ("serviceWorker" in navigator) {
      Object.defineProperty(navigator, "serviceWorker", {
        value: {
          register: () => Promise.resolve(),
          getRegistrations: () => Promise.resolve([]),
          ready: new Promise(() => {}),
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      });
    }
  });
}
