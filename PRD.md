# Roast Dinner Planner — Product Requirements Document

> **Working Title:** Roast Dinner Planner *(configurable — stored as a constant)*
> **Version:** 1.0 (v1)
> **Status:** Draft
> **Last Updated:** 2026-04-21

---

## 1. Overview

### 1.1 Problem Statement

Cooking a roast dinner is one of the most popular British meals, but orchestrating the timing of multiple dishes — each with different prep times, cooking temperatures, and methods — is genuinely difficult, especially for inexperienced cooks. Getting everything to the table hot and at the right time is a skill that takes years to develop.

### 1.2 Solution

A mobile-first web application that guides users through the entire roast dinner process: from choosing their meal, to generating a scaled shopping list, to a step-by-step timed cooking guide with notifications. The app should be **"idiot-proof"** — clear enough that someone who has never cooked a roast dinner can follow it successfully.

### 1.3 Target Users

- People cooking a roast dinner for the first time
- Experienced cooks who want help with timing and orchestration
- Anyone hosting a roast dinner and wanting a stress-free experience

---

## 2. User Flow

### Step 1: Kitchen Setup

The user configures their available oven equipment:

- **Oven cavities:** How many independent oven cavities are available (e.g., 1 for a standard oven, 2 for a range cooker like an AGA/Rangemaster, 0 if no oven)
- **Hob:** Assumed always available (no burner tracking for v1)

> **Deferred to v1.1+:** Air fryer, Instant Pot, and slow cooker support.

This configuration affects the scheduler's capacity planning — how many dishes can be in the oven simultaneously and at what temperatures.

### Step 2: Meal Configuration

- **Meat & cut:** Choose from chicken, beef, lamb, or pork, with 2–3 specific cuts per meat
- **Doneness** *(where applicable)*: For beef and lamb, select desired doneness (rare, medium-rare, medium, medium-well, well-done). Affects cooking time calculation
- **Number of people:** Used to calculate a recommended joint weight and scale side ingredients
- **Actual joint weight:** The app suggests a weight based on servings, but the user enters what they actually bought (the schedule then calculates from this real weight)
- **Serving time:** The target time everything should be ready
- **Sides:** Select from the v1 set, with cooking method variants where applicable (e.g., steamed vs honey-roasted carrots)
- **Homemade vs pre-made:** For items like Yorkshire puddings, stuffing, and gravy — choose to make from scratch (recipe and steps included) or buy pre-made (added to shopping list, no cooking steps)
- **Condiments:** Suggested based on selected meat as optional buy-only extras
- **Prep-ahead:** Per-step toggles for tasks that can be done the night before (e.g., "parboil and rough up potatoes", "make stuffing"). Only steps marked as `canPrepAhead` in the recipe data offer this option
- **Dietary flags:** Used to **filter** sides that match dietary requirements (e.g., only show gluten-free options). No recipe adaptation or substitution in v1
- **Oven temperature display:** Celsius fan (default) / Celsius conventional / Gas Mark

### Step 3: Shopping List

- Generated from the meal configuration
- Ingredients scaled to the number of people, with discrete breakpoints for items like eggs (e.g., going from 2→3 eggs scales flour from 100g→150g to retain ratios)
- Ingredients are **deduplicated** across recipes using a normalised ingredient catalogue (e.g., "butter" needed for mash and roast potatoes is combined into one line)
- Grouped by supermarket category (Meat & Fish, Fresh Vegetables, Dairy & Eggs, Storecupboard, Frozen, etc.)
- Users check off items they already have
- Remaining unchecked items form the "to buy" list
- **Export options:**
  - Copy as formatted text (clipboard)
  - Share via Web Share API (native share sheet on mobile)

> **v1 scope:** All ingredient quantities are metric only. Oven temperatures support Celsius/Gas Mark display.

### Step 4: Review Plan

- Full timeline of all cooking steps displayed before committing
- Steps are ordered and grouped, with timing calculated backwards from the serving time
- The scheduler respects oven capacity — no more dishes occupy the oven than available cavities allow, and temperature conflicts are resolved by sequencing (e.g., meat at 180°C → potatoes at 200°C after meat rests)
- Equipment checklist: a list of required equipment for the selected meal (e.g., roasting tin, baking tray, saucepan, carving knife, meat thermometer). Generated from the `requiredEquipment` fields in each recipe step
- Option to go back and adjust configuration

### Step 5: Cook

- User hits **"Start Cooking"** to begin
- **UI layout (responsive):**
  - **Desktop/tablet:** Two-column layout. Left column shows the full timeline with a progress indicator — steps displayed as dots on a vertical timeline, filling in as completed, with a progress line advancing over time. Right column shows the current step with clear, beginner-friendly instructions
  - **Mobile:** Single column — current step is prominent at the top, with a collapsible timeline below
- **Notifications (best-effort):**
  - In-app visual countdown timers and audio chime when a step is due — this is the primary notification mechanism and always works
  - Browser Notification API used where permission is granted, for when the user switches tabs or locks their screen. Permission is requested at the start of the cooking flow
  - The app encourages users to keep the tab/screen open for reliable alerts
  - Falls back gracefully — in-app alerts always work regardless of notification permissions
- **Smart step grouping:** Steps occurring within a few minutes of each other are combined where practical (e.g., "Set oven to 200°C and put the potatoes in")
- **Mid-cook adjustments:**
  - **Mark step done early:** Tap a step to mark it complete; timeline advances
  - **Skip a dish:** Remove all remaining steps for a dish; timeline recalculates
  - **"I'm running X minutes late":** Shifts all remaining step times forward by a chosen offset

### Step 6: Done

🎉 Enjoy your roast dinner!

---

## 3. Features

### 3.1 Equipment Checklist

Before cooking begins (shown during plan review), display a checklist of required equipment based on the selected meal. Each recipe step declares its `requiredEquipment`, and the app aggregates and deduplicates these into a single checklist. Examples: roasting tin, baking tray, large saucepan, colander, carving knife, meat thermometer.

### 3.2 Oven-Aware Scheduling

The timeline scheduler is aware of:

- Number of oven cavities (user-configured)
- Oven temperature requirements per step (from recipe data)
- Real-world constraints encoded in step dependencies (e.g., "meat must rest before potatoes go in at higher temp")

The scheduler resolves conflicts by sequencing dishes that require different oven temperatures, and allows concurrent oven use when temperatures are compatible. The hob is treated as always available (no capacity constraint in v1).

### 3.3 Ingredient Scaling with Breakpoints

Recipes scale to the number of servings, but use discrete breakpoints for items that can't be fractioned (e.g., eggs). When a breakpoint ingredient crosses a threshold, all ingredients in the same scaling group adjust proportionally to maintain correct ratios.

### 3.4 Shareable Plans

- Plans are stored in **Cloudflare KV** via a **Cloudflare Worker**
- A "Share" button generates a short URL (e.g., `roastdinnerplanner.app/p/abc123`)
- Links are bookmarkable and shareable (e.g., via WhatsApp)
- No authentication required — plans are anonymous
- KV entries have a TTL (e.g., 30 days) to manage storage
- Opening a shared link loads the meal configuration at the Review Plan step; cooking progress is not shared (it's local to each device)

### 3.5 State Persistence

- Active cooking state (current step, timers, progress, checked-off shopping items) is saved to **localStorage**
- Survives page reloads and brief connectivity loss
- Shared plan URL loads the meal configuration; cooking progress is local to the device

### 3.6 PWA / Offline Support

- Implemented via `vite-plugin-pwa` with service worker caching
- Once loaded, the app works fully offline (all recipe data is baked into the static build)
- Only feature requiring connectivity: creating/loading shared plan URLs (graceful degradation with a clear message)
- Keeps the cooking timer running reliably even without connectivity

### 3.7 Notifications (Best-Effort)

- **Primary:** In-app visual timers + audio chime. Always works while the tab is open
- **Secondary:** Browser Notification API for background/tab-switch scenarios. Requested at cook start; graceful fallback if denied
- **Not supported in v1:** True push notifications via a push service (would require a backend). The app encourages keeping the tab open
- **Screen wake lock:** Uses the Screen Wake Lock API (where supported) to prevent the device sleeping during active cooking

---

## 4. Data Model

### 4.1 Recipe Data Format

All recipe data is stored as **JSON files** baked into the static build at compile time. No runtime API calls needed.

The recipe JSON schema is designed to be:
- **Human-readable:** Clear structure, descriptive field names, authored by hand
- **Contributable:** Others can add recipes by writing JSON files and submitting PRs
- **Validatable:** A JSON Schema definition validates all recipe files at build time and in CI, catching errors before they reach users

> A JSON Schema file (`recipe.schema.json`) will be provided in the repository. All recipe JSON files are validated against it during the build step.

### 4.2 Normalised Ingredient Catalogue

A central catalogue of all known ingredients, referenced by stable IDs across all recipes. This enables deduplication and grouping on the shopping list.

```json
{
  "plain-flour": {
    "name": "Plain flour",
    "defaultUnit": "g",
    "category": "storecupboard"
  },
  "eggs-large": {
    "name": "Large eggs",
    "defaultUnit": "whole",
    "category": "dairy-and-eggs"
  },
  "butter-unsalted": {
    "name": "Unsalted butter",
    "defaultUnit": "g",
    "category": "dairy-and-eggs"
  },
  "carrots": {
    "name": "Carrots",
    "defaultUnit": "g",
    "category": "fresh-vegetables"
  }
}
```

**Shopping list categories** (maps to typical supermarket aisles):
- `meat-and-fish`
- `fresh-vegetables`
- `dairy-and-eggs`
- `storecupboard`
- `frozen`
- `bakery`
- `condiments`

### 4.3 Meats

Each meat type contains multiple cuts. Per cut:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g., `pork-shoulder`) |
| `name` | Display name (e.g., "Pork Shoulder") |
| `meat` | Parent meat type (`chicken`, `beef`, `lamb`, `pork`) |
| `weightPerPersonKg` | Recommended weight per person (used to suggest purchase weight) |
| `supportsDonenessSelection` | Whether doneness affects cooking time (true for beef/lamb joints) |
| `cookingTime` | See "Cooking Time Model" below |
| `suggestedCondiments` | Array of condiment IDs to offer as optional extras |
| `steps` | Array of step objects (see "Step Model" below) |

#### Cooking Time Model

For **whole joints** (where cooking time depends on weight):

```json
{
  "type": "per-weight",
  "doneness": {
    "rare":        { "minutesPerKg": 20, "baseMinutes": 15 },
    "medium-rare": { "minutesPerKg": 25, "baseMinutes": 15 },
    "medium":      { "minutesPerKg": 30, "baseMinutes": 15 },
    "medium-well": { "minutesPerKg": 35, "baseMinutes": 15 },
    "well-done":   { "minutesPerKg": 40, "baseMinutes": 15 }
  },
  "restingMinutes": 20
}
```

For **piece-based cuts** (e.g., chicken thighs) where cooking time is fixed regardless of quantity:

```json
{
  "type": "fixed",
  "minutes": 35,
  "restingMinutes": 5
}
```

### 4.4 Step Model (Core of the Scheduler)

Recipes are modelled as **step graphs**, not single-duration tasks. Each dish (meat or side) contains an ordered array of steps, and steps can declare dependencies on steps from other dishes.

This is the fundamental building block that the scheduler uses to generate the timeline.

```json
{
  "id": "roast-potatoes-parboil",
  "dishId": "roast-potatoes",
  "summary": "Parboil the potatoes",
  "instruction": "Peel and cut the potatoes into large, even chunks. Place in a large saucepan of cold salted water. Bring to the boil and simmer for 10 minutes until the edges are just starting to soften.",
  "durationMinutes": 15,
  "resource": "hob",
  "ovenTempCelsius": null,
  "requiredEquipment": ["large-saucepan", "colander", "peeler"],
  "canPrepAhead": true,
  "dependsOn": [],
  "tags": ["prep"]
}
```

```json
{
  "id": "roast-potatoes-roast",
  "dishId": "roast-potatoes",
  "summary": "Roast the potatoes",
  "instruction": "Drain the potatoes and shake in the colander to rough up the edges. Place on a baking tray with hot oil/fat. Roast for 45–55 minutes, turning halfway, until golden and crispy.",
  "durationMinutes": 50,
  "resource": "oven",
  "ovenTempCelsius": 200,
  "requiredEquipment": ["baking-tray"],
  "canPrepAhead": false,
  "dependsOn": ["roast-potatoes-parboil"],
  "tags": ["cook"]
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique step identifier within the recipe |
| `dishId` | Which dish this step belongs to (for skip/filter) |
| `summary` | Short label for the timeline (e.g., "Parboil potatoes") |
| `instruction` | Full beginner-friendly instruction text |
| `durationMinutes` | How long this step takes |
| `resource` | What equipment this step occupies: `oven`, `hob`, `none` (prep/manual work) |
| `ovenTempCelsius` | Required oven temperature (null if not oven-based). Fan temperature |
| `requiredEquipment` | Array of equipment IDs needed for this step |
| `canPrepAhead` | Whether this step can be done the night before |
| `dependsOn` | Array of step IDs that must complete before this step can start |
| `tags` | Categorisation: `prep`, `cook`, `rest`, `serve` |

The scheduler collects all steps from all selected dishes, resolves the dependency graph, and works backwards from the serving time to assign start times — respecting oven capacity and temperature constraints.

### 4.5 Sides & Accompaniments

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g., `roast-potatoes`) |
| `name` | Display name |
| `category` | `staple` / `vegetable` / `extra` |
| `variants` | Array of variant objects, each with its own steps and ingredients (e.g., `{ id: "carrots-steamed", name: "Steamed" }`, `{ id: "carrots-honey-roasted", name: "Honey Roasted" }`) |
| `homemadeAvailable` | Whether a from-scratch recipe exists |
| `preMadeOption` | Shopping list description for pre-made version (e.g., "Yorkshire puddings (frozen, pack of 12)") |
| `ingredients` | Array of ingredient references with quantities and scaling rules |
| `steps` | Array of step objects (same Step Model as meats) |
| `dietaryFlags` | Array of flags (e.g., `gluten-free`, `dairy-free`, `vegetarian`) |

### 4.6 Ingredient References (within recipes)

Recipe ingredients reference the normalised catalogue by ID:

```json
{
  "ingredientId": "plain-flour",
  "baseQuantity": 100,
  "baseServings": 4,
  "scalingGroup": "yorkshire-batter",
  "isBreakpointIngredient": false
}
```

```json
{
  "ingredientId": "eggs-large",
  "baseQuantity": 2,
  "baseServings": 4,
  "scalingGroup": "yorkshire-batter",
  "isBreakpointIngredient": true,
  "breakpoints": [
    { "minServings": 1, "maxServings": 4, "quantity": 2 },
    { "minServings": 5, "maxServings": 8, "quantity": 3 },
    { "minServings": 9, "maxServings": 12, "quantity": 4 }
  ]
}
```

When a breakpoint ingredient crosses a threshold, all ingredients in the same `scalingGroup` scale proportionally based on the ratio change (e.g., 2→3 eggs = 1.5× multiplier for flour, milk in that group).

### 4.7 Condiments (buy-only)

| Field | Description |
|-------|-------------|
| `id` | Unique identifier (e.g., `mint-sauce`) |
| `name` | Display name |
| `shoppingCategory` | Category in the normalised catalogue (e.g., `condiments`) |
| `shoppingListName` | What appears on the shopping list (e.g., "Mint sauce (jar)") |
| `suggestedForMeats` | Which meat types this is commonly paired with |

### 4.8 Shared Plan (Cloudflare KV)

```json
{
  "id": "abc123",
  "createdAt": "2026-04-21T18:00:00Z",
  "config": {
    "ovenCavities": 1,
    "meat": {
      "cutId": "beef-topside",
      "actualWeightKg": 1.5,
      "doneness": "medium"
    },
    "servings": 4,
    "servingTime": "14:00",
    "sides": [
      { "sideId": "roast-potatoes", "mode": "homemade" },
      { "sideId": "yorkshire-puddings", "mode": "premade" },
      { "sideId": "carrots", "mode": "homemade", "variantId": "honey-roasted" },
      { "sideId": "broccoli", "mode": "homemade", "variantId": "steamed" }
    ],
    "condiments": ["mint-sauce"],
    "gravy": { "sideId": "gravy", "mode": "homemade" },
    "ovenTempDisplay": "celsius-fan",
    "prepAheadSteps": ["roast-potatoes-parboil", "stuffing-mix"]
  }
}
```

TTL: 30 days from creation.

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + TypeScript |
| **Build tool** | Vite |
| **UI components** | shadcn/ui (Tailwind CSS) |
| **State management** | React state + localStorage for persistence |
| **PWA** | vite-plugin-pwa |
| **Hosting** | Cloudflare Pages |
| **Short links / sharing** | Cloudflare Workers + KV |
| **Analytics** | Cloudflare Web Analytics (privacy-respecting, free) |
| **i18n** | Designed for internationalisation (string extraction), English only at launch |
| **Recipe data** | Static JSON files with JSON Schema validation, imported at build time |
| **Recipe validation** | JSON Schema (`recipe.schema.json`) validated in CI and at build time |

---

## 6. Data Sourcing Strategy

Recipe data is **manually curated** and **original**:

- **Factual data** (cooking times, temperatures, weights, ingredient ratios) may be referenced from public sources including Waitrose, BBC Good Food, and others
- **Instructions are written from scratch** in a consistent, beginner-friendly voice — synthesised from multiple sources, not copied from any single one
- **All recipes must be validated** for accuracy before inclusion
- Ingredients lists (factual, not copyrightable) and cooking temperatures/times (factual data) are freely usable
- No verbatim copying of instructions or creative expression from any source

---

## 7. Accessibility

- Follow **WCAG 2.1 AA** standards
- Semantic HTML throughout
- Full keyboard navigation
- Screen reader support with appropriate ARIA labels
- Sufficient colour contrast ratios
- Large, touch-friendly tap targets (important for kitchen use with wet/floury hands)
- Responsive text sizing

---

## 8. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **First Contentful Paint** | < 1.5s |
| **Time to Interactive** | < 3s |
| **Offline capability** | Full functionality after initial load (except sharing) |
| **Browser support** | Modern browsers (Chrome, Firefox, Safari, Edge — last 2 versions) |
| **Mobile responsiveness** | Fully functional from 320px width upward |
| **Configurable branding** | App name stored as a config constant, easily changeable |
| **Data format** | All recipe data in JSON, validated against JSON Schema |

---

## 9. Supported Meats & Cuts (v1)

> 2–3 most common cuts per meat. Additional cuts added post-launch.

### Chicken
- Whole chicken
- Chicken thighs (bone-in)

### Beef
- Topside joint
- Rib of beef (bone-in)

### Lamb
- Leg of lamb
- Shoulder of lamb

### Pork
- Pork loin joint
- Pork belly

> Specific cuts to be validated against Waitrose product range and common availability.

---

## 10. Supported Sides & Accompaniments (v1)

> Core set for v1. Additional sides and variants added post-launch.

### Staples
- Roast potatoes
- Mashed potatoes
- Yorkshire puddings *(homemade / pre-made)*
- Stuffing *(homemade / pre-made)*
- Gravy *(homemade / pre-made)*

### Vegetables (v1 set — ~6 most popular)
- Carrots *(steamed / honey-roasted)*
- Parsnips *(roasted)*
- Broccoli *(steamed)*
- Green beans *(steamed)*
- Peas *(boiled)*
- Brussels sprouts *(boiled / roasted)*

### Extras
- Cauliflower cheese
- Pigs in blankets

### Condiments (buy-only, suggested based on meat)
- Cranberry sauce → Chicken
- Mint sauce → Lamb
- Apple sauce → Pork
- Horseradish → Beef

---

## 11. Future Considerations (Post-v1)

### v1.1 — Equipment & Scope Expansion
- Air fryer support (scheduling + alternative recipes)
- Instant Pot / slow cooker support
- Additional meat cuts (3–4 per meat)
- Additional vegetables (cabbage, leeks, cauliflower, etc.)
- More cooking method variants per vegetable

### v1.2 — Dietary & Customisation
- Advanced dietary support with recipe substitutions (not just filtering)
- Metric/imperial toggle for all ingredient measurements
- More granular gravy options (pan drippings vs stock-based)
- Oven temperature adjustment with cascading recalculation

### Future
- Turkey and other meats (duck, venison)
- Vegetarian/vegan centrepieces (nut roast, Wellington)
- Todoist / third-party shopping list integrations
- User accounts to save favourite configurations
- Multiple meal history
- "What to do with leftovers" suggestions
- Additional recipe data for variant cooking methods
- Bread sauce

---

## 12. Open Questions

1. **Domain name** — What domain will this be hosted on?
2. **KV TTL** — 30 days for shared plans — should completed/old plans expire sooner?
3. **Notification sound** — Custom audio chime or system default?
4. **Recipe validation process** — Who tests the recipes for accuracy before launch? (The JSON is schema-validated, but the cooking instructions need human testing)
5. **Screen Wake Lock** — The Screen Wake Lock API is supported in Chrome and Edge but not Firefox or Safari. Should we show a warning on unsupported browsers?
