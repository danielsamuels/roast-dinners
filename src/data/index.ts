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
import chickenThighs from "../../data/meats/chicken-thighs.json";
import beefTopside from "../../data/meats/beef-topside.json";
import beefRib from "../../data/meats/beef-rib.json";
import lambLeg from "../../data/meats/lamb-leg.json";
import lambShoulder from "../../data/meats/lamb-shoulder.json";
import porkLoin from "../../data/meats/pork-loin.json";
import porkBelly from "../../data/meats/pork-belly.json";
import roastPotatoes from "../../data/sides/roast-potatoes.json";
import mashedPotatoes from "../../data/sides/mashed-potatoes.json";
import yorkshirePuddings from "../../data/sides/yorkshire-puddings.json";
import stuffing from "../../data/sides/stuffing.json";
import gravy from "../../data/sides/gravy.json";
import carrotsSteamed from "../../data/sides/carrots-steamed.json";
import carrotsHoneyRoasted from "../../data/sides/carrots-honey-roasted.json";
import parsnipsRoasted from "../../data/sides/parsnips-roasted.json";
import broccoliSteamed from "../../data/sides/broccoli-steamed.json";
import greenBeansSteamed from "../../data/sides/green-beans-steamed.json";
import peasBoiled from "../../data/sides/peas-boiled.json";
import brusselsSproutsBoiled from "../../data/sides/brussels-sprouts-boiled.json";
import brusselsSproutsRoasted from "../../data/sides/brussels-sprouts-roasted.json";
import cauliflowerCheese from "../../data/sides/cauliflower-cheese.json";
import pigsInBlankets from "../../data/sides/pigs-in-blankets.json";

const meatCuts: MeatCut[] = [
  chickenWhole as unknown as MeatCut,
  chickenThighs as unknown as MeatCut,
  beefTopside as unknown as MeatCut,
  beefRib as unknown as MeatCut,
  lambLeg as unknown as MeatCut,
  lambShoulder as unknown as MeatCut,
  porkLoin as unknown as MeatCut,
  porkBelly as unknown as MeatCut,
];

const sides: Side[] = [
  roastPotatoes as unknown as Side,
  mashedPotatoes as unknown as Side,
  yorkshirePuddings as unknown as Side,
  stuffing as unknown as Side,
  gravy as unknown as Side,
  carrotsSteamed as unknown as Side,
  carrotsHoneyRoasted as unknown as Side,
  parsnipsRoasted as unknown as Side,
  broccoliSteamed as unknown as Side,
  greenBeansSteamed as unknown as Side,
  peasBoiled as unknown as Side,
  brusselsSproutsBoiled as unknown as Side,
  brusselsSproutsRoasted as unknown as Side,
  cauliflowerCheese as unknown as Side,
  pigsInBlankets as unknown as Side,
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
