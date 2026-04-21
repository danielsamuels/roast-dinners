// ─── Enums / Union Types ────────────────────────────────────────────

export type MeatType = "chicken" | "beef" | "lamb" | "pork";

export type Doneness =
  | "rare"
  | "medium-rare"
  | "medium"
  | "medium-well"
  | "well-done";

export type Resource = "oven" | "hob" | "none";

export type StepTag = "prep" | "cook" | "rest" | "serve";

export type OvenTempDisplay =
  | "celsius-fan"
  | "celsius-conventional"
  | "gas-mark";

export type ShoppingCategory =
  | "meat-and-fish"
  | "fresh-vegetables"
  | "dairy-and-eggs"
  | "storecupboard"
  | "frozen"
  | "bakery"
  | "condiments";

export type DietaryFlag =
  | "gluten-free"
  | "dairy-free"
  | "vegetarian"
  | "vegan"
  | "nut-free";

export type SideCategory = "staple" | "vegetable" | "extra";

export type SideMode = "homemade" | "premade";

// ─── Cooking Time ───────────────────────────────────────────────────

export interface DonenessTime {
  minutesPerKg: number;
  baseMinutes: number;
}

export interface CookingTimePerWeight {
  type: "per-weight";
  doneness: Partial<Record<Doneness, DonenessTime>>;
  restingMinutes: number;
}

export interface CookingTimeFixed {
  type: "fixed";
  minutes: number;
  restingMinutes: number;
}

export type CookingTime = CookingTimePerWeight | CookingTimeFixed;

// ─── Recipe Step ────────────────────────────────────────────────────

export interface RecipeStep {
  id: string;
  dishId: string;
  summary: string;
  instruction: string;
  durationMinutes: number;
  resource: Resource;
  ovenTempCelsius: number | null;
  requiredEquipment: string[];
  canPrepAhead: boolean;
  dependsOn: string[];
  tags: StepTag[];
}

// ─── Ingredient References ──────────────────────────────────────────

export interface Breakpoint {
  minServings: number;
  maxServings: number;
  quantity: number;
}

export interface IngredientRef {
  ingredientId: string;
  baseQuantity: number;
  baseServings: number;
  scalingGroup: string;
  isBreakpointIngredient: boolean;
  breakpoints?: Breakpoint[];
}

// ─── Ingredient Catalogue ───────────────────────────────────────────

export interface Ingredient {
  name: string;
  defaultUnit: string;
  category: ShoppingCategory;
}

export type IngredientCatalogue = Record<string, Ingredient>;

// ─── Meat Cut ───────────────────────────────────────────────────────

export interface MeatCut {
  id: string;
  name: string;
  meat: MeatType;
  weightPerPersonKg: number;
  supportsDonenessSelection: boolean;
  cookingTime: CookingTime;
  suggestedCondiments: string[];
  ingredients: IngredientRef[];
  steps: RecipeStep[];
}

// ─── Side Variant ───────────────────────────────────────────────────

export interface SideVariant {
  id: string;
  name: string;
  ingredients: IngredientRef[];
  steps: RecipeStep[];
}

// ─── Side ───────────────────────────────────────────────────────────

export interface Side {
  id: string;
  name: string;
  category: SideCategory;
  variants: SideVariant[];
  homemadeAvailable: boolean;
  preMadeOption: string | null;
  ingredients: IngredientRef[];
  steps: RecipeStep[];
  dietaryFlags: DietaryFlag[];
}

// ─── Condiment ──────────────────────────────────────────────────────

export interface Condiment {
  id: string;
  name: string;
  shoppingCategory: ShoppingCategory;
  shoppingListName: string;
  suggestedForMeats: MeatType[];
}

// ─── Meal Configuration & Sharing ───────────────────────────────────

export interface SideSelection {
  sideId: string;
  mode: SideMode;
  variantId?: string;
}

export interface MealConfig {
  ovenCavities: number;
  meat: {
    cutId: string;
    actualWeightKg: number;
    doneness?: Doneness;
  };
  servings: number;
  servingTime: string;
  sides: SideSelection[];
  condiments: string[];
  gravy: SideSelection;
  ovenTempDisplay: OvenTempDisplay;
  prepAheadSteps: string[];
}

export interface SharedPlan {
  id: string;
  createdAt: string;
  config: MealConfig;
}
