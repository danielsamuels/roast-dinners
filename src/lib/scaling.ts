import type {
  IngredientRef,
  IngredientCatalogue,
  ShoppingCategory,
  Breakpoint,
} from "@/types/recipe";

// ─── Types ──────────────────────────────────────────────────────────

export interface ScaledIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: ShoppingCategory;
  fromDishes: string[];
}

export interface DishIngredientRefs {
  dishName: string;
  refs: IngredientRef[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function findBreakpointQuantity(
  breakpoints: Breakpoint[],
  servings: number,
): number | null {
  for (const bp of breakpoints) {
    if (servings >= bp.minServings && servings <= bp.maxServings) {
      return bp.quantity;
    }
  }
  // If servings exceeds all breakpoints, use the last one
  if (breakpoints.length > 0) {
    const last = breakpoints[breakpoints.length - 1];
    if (servings > last.maxServings) {
      return last.quantity;
    }
  }
  return null;
}

/**
 * For a set of ingredient refs from a single dish, compute the breakpoint
 * ratio for each scaling group that contains a breakpoint ingredient.
 *
 * Returns a map: scalingGroup → ratio (breakpointQty / baseQty)
 */
function computeBreakpointRatios(
  refs: IngredientRef[],
  servings: number,
): Map<string, number> {
  const ratios = new Map<string, number>();

  for (const ref of refs) {
    if (ref.isBreakpointIngredient && ref.breakpoints) {
      const bpQty = findBreakpointQuantity(ref.breakpoints, servings);
      if (bpQty !== null && ref.baseQuantity !== 0) {
        ratios.set(ref.scalingGroup, bpQty / ref.baseQuantity);
      }
    }
  }

  return ratios;
}

function scaleRef(
  ref: IngredientRef,
  servings: number,
  breakpointRatios: Map<string, number>,
): number {
  // Breakpoint ingredient: use the breakpoint quantity directly
  if (ref.isBreakpointIngredient && ref.breakpoints) {
    const bpQty = findBreakpointQuantity(ref.breakpoints, servings);
    if (bpQty !== null) return bpQty;
  }

  // Same scaling group as a breakpoint ingredient: apply proportional ratio
  const ratio = breakpointRatios.get(ref.scalingGroup);
  if (ratio !== undefined) {
    return ref.baseQuantity * ratio;
  }

  // Default: simple linear scaling
  if (ref.baseServings === 0) return ref.baseQuantity;
  return ref.baseQuantity * (servings / ref.baseServings);
}

// ─── Main Function ──────────────────────────────────────────────────

export function scaleIngredients(
  ingredientRefs: DishIngredientRefs[],
  servings: number,
  ingredientCatalogue: IngredientCatalogue,
): ScaledIngredient[] {
  // Accumulate: ingredientId → { quantity, fromDishes }
  const accumulator = new Map<
    string,
    { quantity: number; fromDishes: Set<string> }
  >();

  for (const dish of ingredientRefs) {
    const breakpointRatios = computeBreakpointRatios(dish.refs, servings);

    for (const ref of dish.refs) {
      const qty = scaleRef(ref, servings, breakpointRatios);
      const existing = accumulator.get(ref.ingredientId);

      if (existing) {
        existing.quantity += qty;
        existing.fromDishes.add(dish.dishName);
      } else {
        accumulator.set(ref.ingredientId, {
          quantity: qty,
          fromDishes: new Set([dish.dishName]),
        });
      }
    }
  }

  // Build result with catalogue lookups
  const result: ScaledIngredient[] = [];

  for (const [ingredientId, data] of accumulator) {
    const catalogueEntry = ingredientCatalogue[ingredientId];
    if (!catalogueEntry) continue;

    result.push({
      ingredientId,
      name: catalogueEntry.name,
      quantity: Math.round(data.quantity * 100) / 100,
      unit: catalogueEntry.defaultUnit,
      category: catalogueEntry.category,
      fromDishes: Array.from(data.fromDishes).sort(),
    });
  }

  // Sort by category then name
  const categoryOrder: ShoppingCategory[] = [
    "meat-and-fish",
    "fresh-vegetables",
    "dairy-and-eggs",
    "storecupboard",
    "frozen",
    "bakery",
    "condiments",
  ];

  result.sort((a, b) => {
    const catDiff =
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.name.localeCompare(b.name);
  });

  return result;
}
