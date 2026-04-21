import Ajv from "ajv";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_DIR = join(ROOT, "data");

const schema = JSON.parse(
  readFileSync(join(DATA_DIR, "recipe.schema.json"), "utf-8"),
);

const ajv = new Ajv({ allErrors: true });
ajv.addSchema(schema, "recipe");

let errors = 0;

type ValidatorName =
  | "ingredientCatalogue"
  | "condimentsArray"
  | "meatCut"
  | "side";

const validators: Record<ValidatorName, ReturnType<typeof ajv.compile>> = {
  ingredientCatalogue: ajv.compile({
    $ref: "recipe#/definitions/ingredientCatalogue",
  }),
  condimentsArray: ajv.compile({
    $ref: "recipe#/definitions/condimentsArray",
  }),
  meatCut: ajv.compile({ $ref: "recipe#/definitions/meatCut" }),
  side: ajv.compile({ $ref: "recipe#/definitions/side" }),
};

function validate(
  label: string,
  data: unknown,
  refName: ValidatorName,
): void {
  const isValid = validators[refName];
  if (isValid(data)) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}`);
    for (const err of isValid.errors ?? []) {
      console.error(`     ${err.instancePath} ${err.message}`);
    }
    errors++;
  }
}

// ─── Ingredient catalogue ───────────────────────────────────────────
console.log("\nIngredient catalogue:");
const ingredients = JSON.parse(
  readFileSync(join(DATA_DIR, "ingredients.json"), "utf-8"),
);
validate("ingredients.json", ingredients, "ingredientCatalogue");

// ─── Condiments ─────────────────────────────────────────────────────
console.log("\nCondiments:");
const condiments = JSON.parse(
  readFileSync(join(DATA_DIR, "condiments.json"), "utf-8"),
);
validate("condiments.json", condiments, "condimentsArray");

// ─── Meat cuts ──────────────────────────────────────────────────────
console.log("\nMeat cuts:");
const meatsDir = join(DATA_DIR, "meats");
for (const file of readdirSync(meatsDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(meatsDir, file), "utf-8"));
  validate(file, data, "meatCut");
}

// ─── Sides ──────────────────────────────────────────────────────────
console.log("\nSides:");
const sidesDir = join(DATA_DIR, "sides");
for (const file of readdirSync(sidesDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(sidesDir, file), "utf-8"));
  validate(file, data, "side");
}

// ─── Cross-reference check: ingredient IDs ──────────────────────────
console.log("\nCross-reference check (ingredient IDs):");
const ingredientIds = new Set(Object.keys(ingredients));
let crossRefOk = true;

function checkIngredientRefs(
  label: string,
  refs: { ingredientId: string }[],
) {
  for (const ref of refs) {
    if (!ingredientIds.has(ref.ingredientId)) {
      console.error(
        `  ❌ ${label}: unknown ingredientId "${ref.ingredientId}"`,
      );
      crossRefOk = false;
      errors++;
    }
  }
}

for (const file of readdirSync(meatsDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(meatsDir, file), "utf-8"));
  checkIngredientRefs(`meats/${file}`, data.ingredients ?? []);
}

for (const file of readdirSync(sidesDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(sidesDir, file), "utf-8"));
  checkIngredientRefs(`sides/${file}`, data.ingredients ?? []);
  for (const variant of data.variants ?? []) {
    checkIngredientRefs(
      `sides/${file} variant "${variant.id}"`,
      variant.ingredients ?? [],
    );
  }
}

if (crossRefOk) {
  console.log("  ✅ All ingredient references are valid");
}

// ─── Summary ────────────────────────────────────────────────────────
console.log("");
if (errors === 0) {
  console.log("✅ All validations passed!");
} else {
  console.error(`❌ ${errors} validation error(s) found.`);
  process.exit(1);
}
