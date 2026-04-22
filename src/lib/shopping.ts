import type {
  ShoppingCategory,
  IngredientCatalogue,
} from "@/types/recipe";
import type { MealConfigState } from "@/hooks/useMealConfig";
import { getMeatCut, getSide, getCondiments, getIngredientCatalogue } from "@/data";
import { scaleIngredients, type DishIngredientRefs } from "./scaling";

// ─── Types ──────────────────────────────────────────────────────────

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  fromDishes: string[];
  isChecked: boolean;
}

export interface BuyOnlyItem {
  id: string;
  name: string;
  category: ShoppingCategory;
}

export interface ShoppingList {
  items: ShoppingItem[];
  buyOnlyItems: BuyOnlyItem[];
  meatName: string;
  servings: number;
}

// ─── Category Display Names ─────────────────────────────────────────

export const CATEGORY_DISPLAY_NAMES: Record<ShoppingCategory, string> = {
  "meat-and-fish": "Meat & Fish",
  "fresh-vegetables": "Fresh Vegetables",
  "dairy-and-eggs": "Dairy & Eggs",
  storecupboard: "Store Cupboard",
  frozen: "Frozen",
  bakery: "Bakery",
  condiments: "Condiments & Sauces",
};

export const CATEGORY_ORDER: ShoppingCategory[] = [
  "meat-and-fish",
  "fresh-vegetables",
  "dairy-and-eggs",
  "storecupboard",
  "frozen",
  "bakery",
  "condiments",
];

// ─── Format Helpers ─────────────────────────────────────────────────

export function formatQuantity(quantity: number, unit: string): string {
  // Round to a sensible display value
  const rounded = Math.round(quantity * 10) / 10;
  const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);

  if (unit === "whole") return display;
  return `${display}${unit}`;
}

// ─── Generator ──────────────────────────────────────────────────────

export function generateShoppingList(
  config: MealConfigState,
  checkedItems: string[],
): ShoppingList {
  const catalogue: IngredientCatalogue = getIngredientCatalogue();
  const dishRefs: DishIngredientRefs[] = [];
  const buyOnlyItems: BuyOnlyItem[] = [];

  const meatCut = config.meatCutId ? getMeatCut(config.meatCutId) : null;

  // 1. Collect meat ingredient refs (excluding the main meat — we add it manually)
  if (meatCut) {
    const nonMeatRefs = meatCut.ingredients.filter(
      (ref) => {
        const entry = catalogue[ref.ingredientId];
        return entry && entry.category !== "meat-and-fish";
      },
    );
    if (nonMeatRefs.length > 0) {
      dishRefs.push({ dishName: meatCut.name, refs: nonMeatRefs });
    }
  }

  // 2. Collect side ingredient refs
  for (const selection of config.sides) {
    const side = getSide(selection.sideId);
    if (!side) continue;

    if (selection.mode === "premade") {
      // Premade sides become buy-only items
      if (side.preMadeOption) {
        buyOnlyItems.push({
          id: `premade-${side.id}`,
          name: side.preMadeOption,
          category: "frozen",
        });
      }
      continue;
    }

    // Homemade: use variant ingredients if applicable, else side ingredients
    if (selection.variantId) {
      const variant = side.variants.find((v) => v.id === selection.variantId);
      if (variant && variant.ingredients.length > 0) {
        dishRefs.push({ dishName: variant.name, refs: variant.ingredients });
        continue;
      }
    }

    if (side.ingredients.length > 0) {
      dishRefs.push({ dishName: side.name, refs: side.ingredients });
    }
  }

  // 3. Collect gravy ingredient refs
  if (config.gravy) {
    const gravySide = getSide(config.gravy.sideId);
    if (gravySide) {
      if (config.gravy.mode === "premade") {
        if (gravySide.preMadeOption) {
          buyOnlyItems.push({
            id: `premade-${gravySide.id}`,
            name: gravySide.preMadeOption,
            category: "storecupboard",
          });
        }
      } else if (gravySide.ingredients.length > 0) {
        dishRefs.push({ dishName: gravySide.name, refs: gravySide.ingredients });
      }
    }
  }

  // 4. Add condiment buy-only items
  const allCondiments = getCondiments();
  for (const condimentId of config.condiments) {
    const condiment = allCondiments.find((c) => c.id === condimentId);
    if (condiment) {
      buyOnlyItems.push({
        id: `condiment-${condiment.id}`,
        name: condiment.shoppingListName,
        category: condiment.shoppingCategory as ShoppingCategory,
      });
    }
  }

  // 5. Scale all collected ingredient refs
  const scaled = scaleIngredients(dishRefs, config.servings, catalogue);

  // 6. Build shopping items with checked state
  const checkedSet = new Set(checkedItems);
  const items: ShoppingItem[] = scaled.map((si) => ({
    ...si,
    isChecked: checkedSet.has(si.ingredientId),
  }));

  // 7. Add the meat itself
  if (meatCut && meatCut.ingredients.length > 0) {
    const meatRef = meatCut.ingredients[0];
    const meatIngredient = catalogue[meatRef.ingredientId];
    if (meatIngredient) {
      const hasActualWeight = config.actualWeightKg !== null;
      const suggestedWeight = +(meatCut.weightPerPersonKg * config.servings).toFixed(2);
      const displayWeight = config.actualWeightKg ?? suggestedWeight;
      const quantityPrefix = hasActualWeight ? "" : "~";
      const note = hasActualWeight ? "" : " (adjust on cooking day)";
      items.unshift({
        ingredientId: meatRef.ingredientId,
        name: meatIngredient.name + note,
        quantity: displayWeight,
        unit: quantityPrefix + "kg",
        category: "meat-and-fish",
        fromDishes: [meatCut.name],
        isChecked: checkedSet.has(meatRef.ingredientId),
      });
    }
  }

  return {
    items,
    buyOnlyItems,
    meatName: meatCut?.name ?? "Roast dinner",
    servings: config.servings,
  };
}

// ─── Export Formatting ──────────────────────────────────────────────

export function formatShoppingListText(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`🛒 Shopping list for ${list.meatName} for ${list.servings} people`);
  lines.push("");

  // Group unchecked items by category
  const uncheckedItems = list.items.filter((item) => !item.isChecked);
  const grouped = new Map<ShoppingCategory, ShoppingItem[]>();

  for (const item of uncheckedItems) {
    const existing = grouped.get(item.category) ?? [];
    existing.push(item);
    grouped.set(item.category, existing);
  }

  for (const category of CATEGORY_ORDER) {
    const categoryItems = grouped.get(category);
    if (!categoryItems || categoryItems.length === 0) continue;

    lines.push(`📦 ${CATEGORY_DISPLAY_NAMES[category]}`);
    for (const item of categoryItems) {
      lines.push(`  • ${item.name} — ${formatQuantity(item.quantity, item.unit)}`);
    }
    lines.push("");
  }

  // Buy-only items
  const uncheckedBuyOnly = list.buyOnlyItems;
  if (uncheckedBuyOnly.length > 0) {
    lines.push("🏷️ Also buy");
    for (const item of uncheckedBuyOnly) {
      lines.push(`  • ${item.name}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
