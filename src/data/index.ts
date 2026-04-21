import type {
  MeatCut,
  Side,
  IngredientCatalogue,
  Ingredient,
  Condiment,
  MeatType,
} from "@/types/recipe";

import ingredientCatalogue from "../../data/ingredients.json";
import condimentsData from "../../data/condiments.json";
import chickenWhole from "../../data/meats/chicken-whole.json";
import roastPotatoes from "../../data/sides/roast-potatoes.json";
import yorkshirePuddings from "../../data/sides/yorkshire-puddings.json";

const meatCuts: MeatCut[] = [chickenWhole as unknown as MeatCut];

const sides: Side[] = [
  roastPotatoes as unknown as Side,
  yorkshirePuddings as unknown as Side,
];

const ingredients = ingredientCatalogue as unknown as IngredientCatalogue;
const condiments = condimentsData as unknown as Condiment[];

// ─── Meat Cuts ──────────────────────────────────────────────────────

export function getMeatCuts(): MeatCut[] {
  return meatCuts;
}

export function getMeatCut(id: string): MeatCut | undefined {
  return meatCuts.find((m) => m.id === id);
}

// ─── Sides ──────────────────────────────────────────────────────────

export function getSides(): Side[] {
  return sides;
}

export function getSide(id: string): Side | undefined {
  return sides.find((s) => s.id === id);
}

// ─── Ingredients ────────────────────────────────────────────────────

export function getIngredient(id: string): Ingredient | undefined {
  return ingredients[id];
}

export function getIngredientCatalogue(): IngredientCatalogue {
  return ingredients;
}

// ─── Condiments ─────────────────────────────────────────────────────

export function getCondiments(): Condiment[] {
  return condiments;
}

export function getCondimentsForMeat(meatType: MeatType): Condiment[] {
  return condiments.filter((c) => c.suggestedForMeats.includes(meatType));
}
