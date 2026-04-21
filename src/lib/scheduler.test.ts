import { describe, it, expect } from "vitest";
import type { MealConfig } from "@/types/recipe";
import {
  generateSchedule,
  calculateMeatRoastDuration,
} from "@/lib/scheduler";
import { getMeatCut, getSide } from "@/data";

// ─── Helpers ────────────────────────────────────────────────────────

const REFERENCE_DATE = new Date(2025, 0, 5); // Sunday 5 Jan 2025

function makeConfig(overrides: Partial<MealConfig> = {}): MealConfig {
  return {
    ovenCavities: 1,
    meat: { cutId: "chicken-whole", actualWeightKg: 1.8, doneness: undefined },
    servings: 4,
    servingTime: "13:00",
    sides: [],
    condiments: [],
    gravy: { sideId: "gravy", mode: "premade" },
    ovenTempDisplay: "celsius-fan",
    prepAheadSteps: [],
    ...overrides,
  };
}

function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

// ─── calculateMeatRoastDuration ─────────────────────────────────────

describe("calculateMeatRoastDuration", () => {
  it("calculates per-weight duration for chicken (single doneness)", () => {
    const cut = getMeatCut("chicken-whole")!;
    // 45 min/kg × 1.8 kg + 20 min = 101 min
    expect(calculateMeatRoastDuration(cut, 1.8)).toBe(101);
  });

  it("calculates per-weight duration for beef rare", () => {
    const cut = getMeatCut("beef-topside")!;
    // rare: 20 min/kg × 1.5 kg + 15 min = 45 min
    expect(calculateMeatRoastDuration(cut, 1.5, "rare")).toBe(45);
  });

  it("calculates per-weight duration for beef well-done", () => {
    const cut = getMeatCut("beef-topside")!;
    // well-done: 40 min/kg × 1.5 kg + 15 min = 75 min
    expect(calculateMeatRoastDuration(cut, 1.5, "well-done")).toBe(75);
  });

  it("returns fixed minutes for fixed-type cooking", () => {
    const cut = getMeatCut("chicken-thighs")!;
    expect(calculateMeatRoastDuration(cut, 999)).toBe(35);
  });

  it("falls back to first doneness when none specified for per-weight", () => {
    const cut = getMeatCut("pork-loin")!;
    // well-done (only option): 30 min/kg × 1.2 kg + 25 min = 61 min
    expect(calculateMeatRoastDuration(cut, 1.2)).toBe(61);
  });
});

// ─── generateSchedule ──────────────────────────────────────────────

describe("generateSchedule", () => {
  it("schedules a single meat dish with steps ending at serving time", () => {
    const config = makeConfig();
    const result = generateSchedule(config, REFERENCE_DATE);

    expect(result.warnings).toEqual([]);
    expect(result.steps.length).toBeGreaterThan(0);

    // Serving time should be 13:00
    expect(result.servingTime.getHours()).toBe(13);
    expect(result.servingTime.getMinutes()).toBe(0);

    // The last step (carve) should end at serving time
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.stepId).toBe("chicken-whole-carve");
    expect(lastStep.endTime.getTime()).toBe(result.servingTime.getTime());

    // Start time should be before serving time
    expect(result.startTime.getTime()).toBeLessThan(
      result.servingTime.getTime(),
    );
    expect(result.totalDuration).toBeGreaterThan(0);
  });

  it("schedules meat + roast potatoes respecting dependencies", () => {
    const config = makeConfig({
      sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
    });
    const result = generateSchedule(config, REFERENCE_DATE);

    expect(result.warnings).toEqual([]);

    // Find potato steps
    const potatoSteps = result.steps.filter(
      (s) => s.dishId === "roast-potatoes",
    );
    expect(potatoSteps.length).toBe(4); // peel, parboil, rough-up, roast

    // Parboil must start after peel ends
    const peel = result.steps.find(
      (s) => s.stepId === "roast-potatoes-peel",
    )!;
    const parboil = result.steps.find(
      (s) => s.stepId === "roast-potatoes-parboil",
    )!;
    expect(parboil.startTime.getTime()).toBeGreaterThanOrEqual(
      peel.endTime.getTime(),
    );

    // Roast must start after rough-up ends
    const roughUp = result.steps.find(
      (s) => s.stepId === "roast-potatoes-rough-up",
    )!;
    const roast = result.steps.find(
      (s) => s.stepId === "roast-potatoes-roast",
    )!;
    expect(roast.startTime.getTime()).toBeGreaterThanOrEqual(
      roughUp.endTime.getTime(),
    );
  });

  it("produces different schedule lengths for beef rare vs well-done", () => {
    const rareConfig = makeConfig({
      meat: { cutId: "beef-topside", actualWeightKg: 1.5, doneness: "rare" },
    });
    const wellDoneConfig = makeConfig({
      meat: {
        cutId: "beef-topside",
        actualWeightKg: 1.5,
        doneness: "well-done",
      },
    });

    const rareResult = generateSchedule(rareConfig, REFERENCE_DATE);
    const wellDoneResult = generateSchedule(wellDoneConfig, REFERENCE_DATE);

    // Well-done should take longer (more total duration)
    expect(wellDoneResult.totalDuration).toBeGreaterThan(
      rareResult.totalDuration,
    );

    // Both should end at the same serving time
    expect(rareResult.servingTime.getTime()).toBe(
      wellDoneResult.servingTime.getTime(),
    );

    // Well-done should start earlier
    expect(wellDoneResult.startTime.getTime()).toBeLessThan(
      rareResult.startTime.getTime(),
    );
  });

  it("sequences oven dishes with 1 cavity when temperatures conflict", () => {
    // Beef at 190°C + roast potatoes at 200°C + parsnips at 200°C
    const config = makeConfig({
      meat: {
        cutId: "beef-topside",
        actualWeightKg: 1.5,
        doneness: "medium",
      },
      sides: [
        { sideId: "roast-potatoes", mode: "homemade" },
        { sideId: "parsnips-roasted", mode: "homemade" },
      ],
      ovenCavities: 1,
    });

    const result = generateSchedule(config, REFERENCE_DATE);

    // Find all oven steps
    const ovenSteps = result.steps.filter((s) => s.resource === "oven");
    expect(ovenSteps.length).toBeGreaterThanOrEqual(2);

    // For any pair of oven steps at different temperatures, they should NOT overlap
    for (let i = 0; i < ovenSteps.length; i++) {
      for (let j = i + 1; j < ovenSteps.length; j++) {
        const a = ovenSteps[i];
        const b = ovenSteps[j];
        if (a.ovenTempCelsius !== b.ovenTempCelsius) {
          const overlap =
            a.startTime.getTime() < b.endTime.getTime() &&
            b.startTime.getTime() < a.endTime.getTime();
          expect(
            overlap,
            `Oven conflict: "${a.summary}" (${a.ovenTempCelsius}°C) and "${b.summary}" (${b.ovenTempCelsius}°C) overlap`,
          ).toBe(false);
        }
      }
    }
  });

  it("allows same-temperature oven steps to overlap", () => {
    // Roast potatoes (200°C) and parsnips (200°C) can share the oven
    const config = makeConfig({
      sides: [
        { sideId: "roast-potatoes", mode: "homemade" },
        { sideId: "parsnips-roasted", mode: "homemade" },
      ],
      ovenCavities: 1,
    });

    const result = generateSchedule(config, REFERENCE_DATE);

    const potatoRoast = result.steps.find(
      (s) => s.stepId === "roast-potatoes-roast",
    )!;
    const parsnipRoast = result.steps.find(
      (s) => s.stepId === "parsnips-roasted-roast",
    );

    // If both exist at 200°C they can overlap (no conflict)
    if (parsnipRoast && potatoRoast.ovenTempCelsius === parsnipRoast.ovenTempCelsius) {
      // No warning about oven conflicts expected
      expect(
        result.warnings.some((w) => w.includes("Oven conflicts")),
      ).toBe(false);
    }
  });

  it("excludes prep-ahead steps from the schedule", () => {
    const config = makeConfig({
      sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
      prepAheadSteps: ["roast-potatoes-peel", "roast-potatoes-parboil"],
    });

    const result = generateSchedule(config, REFERENCE_DATE);

    const stepIds = result.steps.map((s) => s.stepId);
    expect(stepIds).not.toContain("roast-potatoes-peel");
    expect(stepIds).not.toContain("roast-potatoes-parboil");
    // Non-prep-ahead steps should still be present
    expect(stepIds).toContain("roast-potatoes-rough-up");
    expect(stepIds).toContain("roast-potatoes-roast");
  });

  it("aggregates and deduplicates equipment from all steps", () => {
    const config = makeConfig({
      sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
    });

    const result = generateSchedule(config, REFERENCE_DATE);

    // Equipment should be deduplicated
    const uniqueCount = new Set(result.equipmentList).size;
    expect(result.equipmentList.length).toBe(uniqueCount);

    // Should contain equipment from both meat and sides
    expect(result.equipmentList).toContain("roasting-tin");
    expect(result.equipmentList).toContain("meat-thermometer");
    expect(result.equipmentList).toContain("peeler");
    expect(result.equipmentList).toContain("baking-tray");
  });

  it("produces a valid schedule with no sides selected", () => {
    const config = makeConfig({ sides: [] });
    const result = generateSchedule(config, REFERENCE_DATE);

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.warnings).toEqual([]);

    // All steps should be from the meat
    for (const step of result.steps) {
      expect(step.dishId).toBe("chicken-whole");
    }

    // Steps should be ordered by start time
    for (let i = 1; i < result.steps.length; i++) {
      expect(result.steps[i].startTime.getTime()).toBeGreaterThanOrEqual(
        result.steps[i - 1].startTime.getTime(),
      );
    }
  });

  it("returns a warning for an unknown meat cut", () => {
    const config = makeConfig({
      meat: { cutId: "unknown-meat", actualWeightKg: 1, doneness: undefined },
    });
    const result = generateSchedule(config, REFERENCE_DATE);

    expect(result.steps).toEqual([]);
    expect(result.warnings).toContain("Unknown meat cut: unknown-meat");
  });

  it("handles premade sides by not adding their steps", () => {
    const config = makeConfig({
      sides: [{ sideId: "roast-potatoes", mode: "premade" }],
    });
    const result = generateSchedule(config, REFERENCE_DATE);

    const potatoSteps = result.steps.filter(
      (s) => s.dishId === "roast-potatoes",
    );
    expect(potatoSteps).toEqual([]);
  });

  it("correctly calculates total duration from first step to serving", () => {
    const config = makeConfig();
    const result = generateSchedule(config, REFERENCE_DATE);

    const expectedDuration = minutesBetween(
      result.startTime,
      result.servingTime,
    );
    expect(result.totalDuration).toBe(expectedDuration);
  });

  it("populates dishName on every scheduled step", () => {
    const config = makeConfig({
      sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
    });
    const result = generateSchedule(config, REFERENCE_DATE);

    for (const step of result.steps) {
      expect(step.dishName).toBeTruthy();
    }

    const chickenStep = result.steps.find(
      (s) => s.dishId === "chicken-whole",
    )!;
    expect(chickenStep.dishName).toBe("Whole Roast Chicken");

    const potatoStep = result.steps.find(
      (s) => s.dishId === "roast-potatoes",
    )!;
    expect(potatoStep.dishName).toBe("Roast Potatoes");
  });

  it("respects all dependency constraints in the final schedule", () => {
    const config = makeConfig({
      meat: {
        cutId: "beef-topside",
        actualWeightKg: 1.5,
        doneness: "medium",
      },
      sides: [{ sideId: "roast-potatoes", mode: "homemade" }],
    });

    const result = generateSchedule(config, REFERENCE_DATE);
    const stepMap = new Map(result.steps.map((s) => [s.stepId, s]));

    // Verify every step starts after all its dependencies end
    const meatCut = getMeatCut("beef-topside")!;
    const allRecipeSteps = [
      ...meatCut.steps,
      ...(getSide("roast-potatoes")?.steps ?? []),
    ];

    for (const recipeStep of allRecipeSteps) {
      const scheduled = stepMap.get(recipeStep.id);
      if (!scheduled) continue;
      for (const depId of recipeStep.dependsOn) {
        const depScheduled = stepMap.get(depId);
        if (!depScheduled) continue;
        expect(
          scheduled.startTime.getTime(),
          `${recipeStep.id} should start after ${depId} ends`,
        ).toBeGreaterThanOrEqual(depScheduled.endTime.getTime());
      }
    }
  });
});
