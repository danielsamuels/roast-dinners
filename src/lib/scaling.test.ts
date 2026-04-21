import { describe, it, expect } from "vitest";
import { scaleIngredients } from "./scaling";
import type {
  IngredientCatalogue,
  IngredientRef,
  ShoppingCategory,
} from "@/types/recipe";

// ─── Test Catalogue ─────────────────────────────────────────────────

const catalogue: IngredientCatalogue = {
  "eggs-large": {
    name: "Large eggs",
    defaultUnit: "whole",
    category: "dairy-and-eggs",
  },
  "plain-flour": {
    name: "Plain flour",
    defaultUnit: "g",
    category: "storecupboard",
  },
  "whole-milk": {
    name: "Whole milk",
    defaultUnit: "ml",
    category: "dairy-and-eggs",
  },
  salt: {
    name: "Fine sea salt",
    defaultUnit: "tsp",
    category: "storecupboard",
  },
  "sunflower-oil": {
    name: "Sunflower oil",
    defaultUnit: "ml",
    category: "storecupboard",
  },
  "butter-salted": {
    name: "Salted butter",
    defaultUnit: "g",
    category: "dairy-and-eggs",
  },
  "butter-unsalted": {
    name: "Unsalted butter",
    defaultUnit: "g",
    category: "dairy-and-eggs",
  },
  carrots: {
    name: "Carrots",
    defaultUnit: "g",
    category: "fresh-vegetables",
  },
  potatoes: {
    name: "Potatoes",
    defaultUnit: "g",
    category: "fresh-vegetables",
  },
};

// ─── Yorkshire pudding refs (breakpoint example) ────────────────────

const yorkshireRefs: IngredientRef[] = [
  {
    ingredientId: "eggs-large",
    baseQuantity: 2,
    baseServings: 4,
    scalingGroup: "yorkshire-batter",
    isBreakpointIngredient: true,
    breakpoints: [
      { minServings: 1, maxServings: 4, quantity: 2 },
      { minServings: 5, maxServings: 8, quantity: 3 },
      { minServings: 9, maxServings: 12, quantity: 4 },
    ],
  },
  {
    ingredientId: "plain-flour",
    baseQuantity: 100,
    baseServings: 4,
    scalingGroup: "yorkshire-batter",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "whole-milk",
    baseQuantity: 120,
    baseServings: 4,
    scalingGroup: "yorkshire-batter",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "salt",
    baseQuantity: 0.5,
    baseServings: 4,
    scalingGroup: "yorkshire-batter",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "sunflower-oil",
    baseQuantity: 24,
    baseServings: 4,
    scalingGroup: "yorkshire-oil",
    isBreakpointIngredient: false,
  },
];

// ─── Simple linear refs ─────────────────────────────────────────────

const carrotRefs: IngredientRef[] = [
  {
    ingredientId: "carrots",
    baseQuantity: 300,
    baseServings: 4,
    scalingGroup: "carrots-main",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "butter-salted",
    baseQuantity: 15,
    baseServings: 4,
    scalingGroup: "carrots-main",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "salt",
    baseQuantity: 0.5,
    baseServings: 4,
    scalingGroup: "carrots-seasoning",
    isBreakpointIngredient: false,
  },
];

const mashRefs: IngredientRef[] = [
  {
    ingredientId: "potatoes",
    baseQuantity: 800,
    baseServings: 4,
    scalingGroup: "mash-main",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "butter-salted",
    baseQuantity: 50,
    baseServings: 4,
    scalingGroup: "mash-main",
    isBreakpointIngredient: false,
  },
  {
    ingredientId: "whole-milk",
    baseQuantity: 100,
    baseServings: 4,
    scalingGroup: "mash-main",
    isBreakpointIngredient: false,
  },
];

// ─── Tests ──────────────────────────────────────────────────────────

describe("scaleIngredients", () => {
  describe("simple linear scaling", () => {
    it("scales linearly for base servings (4→4)", () => {
      const result = scaleIngredients(
        [{ dishName: "Steamed Carrots", refs: carrotRefs }],
        4,
        catalogue,
      );

      const carrots = result.find((r) => r.ingredientId === "carrots");
      expect(carrots?.quantity).toBe(300);

      const butter = result.find((r) => r.ingredientId === "butter-salted");
      expect(butter?.quantity).toBe(15);
    });

    it("scales linearly for 8 servings (2×)", () => {
      const result = scaleIngredients(
        [{ dishName: "Steamed Carrots", refs: carrotRefs }],
        8,
        catalogue,
      );

      const carrots = result.find((r) => r.ingredientId === "carrots");
      expect(carrots?.quantity).toBe(600);

      const butter = result.find((r) => r.ingredientId === "butter-salted");
      expect(butter?.quantity).toBe(30);
    });

    it("scales linearly for 1 serving", () => {
      const result = scaleIngredients(
        [{ dishName: "Steamed Carrots", refs: carrotRefs }],
        1,
        catalogue,
      );

      const carrots = result.find((r) => r.ingredientId === "carrots");
      expect(carrots?.quantity).toBe(75);
    });

    it("scales linearly for 12 servings (3×)", () => {
      const result = scaleIngredients(
        [{ dishName: "Steamed Carrots", refs: carrotRefs }],
        12,
        catalogue,
      );

      const carrots = result.find((r) => r.ingredientId === "carrots");
      expect(carrots?.quantity).toBe(900);
    });
  });

  describe("breakpoint scaling", () => {
    it("uses breakpoint quantity for eggs at 4 servings", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        4,
        catalogue,
      );

      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(2);
    });

    it("uses breakpoint quantity for eggs at 5 servings (crosses threshold)", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        5,
        catalogue,
      );

      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(3);
    });

    it("uses breakpoint quantity for eggs at 8 servings", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        8,
        catalogue,
      );

      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(3);
    });

    it("uses breakpoint quantity for eggs at 9 servings", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        9,
        catalogue,
      );

      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(4);
    });

    it("uses last breakpoint for servings beyond max", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        15,
        catalogue,
      );

      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(4);
    });
  });

  describe("proportional scaling within a scaling group", () => {
    it("scales flour/milk proportionally when eggs stay at 2 (4 servings)", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        4,
        catalogue,
      );

      // ratio = 2/2 = 1.0 → flour=100, milk=120
      const flour = result.find((r) => r.ingredientId === "plain-flour");
      expect(flour?.quantity).toBe(100);

      const milk = result.find((r) => r.ingredientId === "whole-milk");
      expect(milk?.quantity).toBe(120);
    });

    it("scales flour/milk proportionally when eggs go from 2→3 (5 servings)", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        5,
        catalogue,
      );

      // ratio = 3/2 = 1.5 → flour=150, milk=180
      const flour = result.find((r) => r.ingredientId === "plain-flour");
      expect(flour?.quantity).toBe(150);

      const milk = result.find((r) => r.ingredientId === "whole-milk");
      expect(milk?.quantity).toBe(180);

      // salt in same group: 0.5 * 1.5 = 0.75
      const salt = result.find((r) => r.ingredientId === "salt");
      expect(salt?.quantity).toBe(0.75);
    });

    it("scales flour/milk proportionally when eggs go to 4 (9 servings)", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        9,
        catalogue,
      );

      // ratio = 4/2 = 2.0 → flour=200, milk=240
      const flour = result.find((r) => r.ingredientId === "plain-flour");
      expect(flour?.quantity).toBe(200);

      const milk = result.find((r) => r.ingredientId === "whole-milk");
      expect(milk?.quantity).toBe(240);
    });

    it("oil in a different scaling group scales linearly", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        5,
        catalogue,
      );

      // oil is in "yorkshire-oil" group (no breakpoint) → linear: 24 * 5/4 = 30
      const oil = result.find((r) => r.ingredientId === "sunflower-oil");
      expect(oil?.quantity).toBe(30);
    });
  });

  describe("deduplication across dishes", () => {
    it("merges butter used in multiple recipes", () => {
      const result = scaleIngredients(
        [
          { dishName: "Steamed Carrots", refs: carrotRefs },
          { dishName: "Mashed Potatoes", refs: mashRefs },
        ],
        4,
        catalogue,
      );

      const butter = result.find((r) => r.ingredientId === "butter-salted");
      // 15 (carrots) + 50 (mash) = 65
      expect(butter?.quantity).toBe(65);
      expect(butter?.fromDishes).toEqual([
        "Mashed Potatoes",
        "Steamed Carrots",
      ]);
    });

    it("merges milk from yorkshire puddings and mash", () => {
      const result = scaleIngredients(
        [
          { dishName: "Yorkshire Puddings", refs: yorkshireRefs },
          { dishName: "Mashed Potatoes", refs: mashRefs },
        ],
        4,
        catalogue,
      );

      const milk = result.find((r) => r.ingredientId === "whole-milk");
      // 120 (yorkshire, ratio 1.0) + 100 (mash, linear) = 220
      expect(milk?.quantity).toBe(220);
      expect(milk?.fromDishes).toEqual([
        "Mashed Potatoes",
        "Yorkshire Puddings",
      ]);
    });

    it("merges salt from multiple dishes", () => {
      const result = scaleIngredients(
        [
          { dishName: "Yorkshire Puddings", refs: yorkshireRefs },
          { dishName: "Steamed Carrots", refs: carrotRefs },
        ],
        4,
        catalogue,
      );

      const salt = result.find((r) => r.ingredientId === "salt");
      // 0.5 (yorkshire, ratio 1.0) + 0.5 (carrots, linear) = 1.0
      expect(salt?.quantity).toBe(1);
      expect(salt?.fromDishes).toEqual([
        "Steamed Carrots",
        "Yorkshire Puddings",
      ]);
    });
  });

  describe("edge cases", () => {
    it("handles 1 serving", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        1,
        catalogue,
      );

      // eggs: breakpoint 1-4 → 2
      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(2);

      // flour: ratio = 2/2 = 1.0 → 100
      const flour = result.find((r) => r.ingredientId === "plain-flour");
      expect(flour?.quantity).toBe(100);

      // oil: linear 24 * 1/4 = 6
      const oil = result.find((r) => r.ingredientId === "sunflower-oil");
      expect(oil?.quantity).toBe(6);
    });

    it("handles 12 servings (top of last breakpoint)", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        12,
        catalogue,
      );

      // eggs: breakpoint 9-12 → 4
      const eggs = result.find((r) => r.ingredientId === "eggs-large");
      expect(eggs?.quantity).toBe(4);

      // flour: ratio = 4/2 = 2.0 → 200
      const flour = result.find((r) => r.ingredientId === "plain-flour");
      expect(flour?.quantity).toBe(200);

      // oil: linear 24 * 12/4 = 72
      const oil = result.find((r) => r.ingredientId === "sunflower-oil");
      expect(oil?.quantity).toBe(72);
    });

    it("handles exact breakpoint boundary (4 to 5 servings)", () => {
      const at4 = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        4,
        catalogue,
      );
      const at5 = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        5,
        catalogue,
      );

      const eggs4 = at4.find((r) => r.ingredientId === "eggs-large");
      const eggs5 = at5.find((r) => r.ingredientId === "eggs-large");

      expect(eggs4?.quantity).toBe(2);
      expect(eggs5?.quantity).toBe(3);

      const flour4 = at4.find((r) => r.ingredientId === "plain-flour");
      const flour5 = at5.find((r) => r.ingredientId === "plain-flour");

      expect(flour4?.quantity).toBe(100);
      expect(flour5?.quantity).toBe(150);
    });

    it("handles empty input", () => {
      const result = scaleIngredients([], 4, catalogue);
      expect(result).toEqual([]);
    });

    it("skips ingredients not in catalogue", () => {
      const refs: IngredientRef[] = [
        {
          ingredientId: "nonexistent",
          baseQuantity: 100,
          baseServings: 4,
          scalingGroup: "test",
          isBreakpointIngredient: false,
        },
      ];
      const result = scaleIngredients(
        [{ dishName: "Test", refs }],
        4,
        catalogue,
      );
      expect(result).toEqual([]);
    });

    it("returns results sorted by category then name", () => {
      const result = scaleIngredients(
        [
          { dishName: "Yorkshire Puddings", refs: yorkshireRefs },
          { dishName: "Steamed Carrots", refs: carrotRefs },
        ],
        4,
        catalogue,
      );

      const categories = result.map((r) => r.category);
      const categoryOrder: ShoppingCategory[] = [
        "meat-and-fish",
        "fresh-vegetables",
        "dairy-and-eggs",
        "storecupboard",
        "frozen",
        "bakery",
        "condiments",
      ];

      // Verify categories are in order
      for (let i = 1; i < categories.length; i++) {
        const prevIdx = categoryOrder.indexOf(categories[i - 1]);
        const currIdx = categoryOrder.indexOf(categories[i]);
        expect(currIdx).toBeGreaterThanOrEqual(prevIdx);
      }
    });

    it("tracks fromDishes correctly for single dish", () => {
      const result = scaleIngredients(
        [{ dishName: "Yorkshire Puddings", refs: yorkshireRefs }],
        4,
        catalogue,
      );

      for (const item of result) {
        expect(item.fromDishes).toEqual(["Yorkshire Puddings"]);
      }
    });
  });
});
