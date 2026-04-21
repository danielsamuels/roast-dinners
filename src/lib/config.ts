import type { MealConfig } from "@/types/recipe";
import type { MealConfigState } from "@/hooks/useMealConfig";

/**
 * Convert the UI state shape into the MealConfig the scheduler expects.
 * Returns null if required fields are missing.
 */
export function buildMealConfig(state: MealConfigState): MealConfig | null {
  if (!state.meatCutId || !state.actualWeightKg) return null;

  return {
    ovenCavities: state.ovenCavities,
    meat: {
      cutId: state.meatCutId,
      actualWeightKg: state.actualWeightKg,
      doneness: state.doneness ?? undefined,
    },
    servings: state.servings,
    servingTime: state.servingTime,
    sides: state.sides,
    condiments: state.condiments,
    gravy: state.gravy ?? { sideId: "gravy", mode: "premade" },
    ovenTempDisplay: state.ovenTempDisplay,
    prepAheadSteps: state.prepAheadSteps,
  };
}
