import type {
  MealConfig,
  MeatCut,
  RecipeStep,
  Resource,
  StepTag,
  CookingTimePerWeight,
  Doneness,
} from "@/types/recipe";
import { getMeatCut, getSide } from "@/data";

// ─── Exported Types ─────────────────────────────────────────────────

export interface ScheduledStep {
  stepId: string;
  dishId: string;
  dishName: string;
  summary: string;
  instruction: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  resource: Resource;
  ovenTempCelsius: number | null;
  requiredEquipment: string[];
  tags: StepTag[];
  canPrepAhead: boolean;
  isPrepAhead: boolean;
}

export interface ScheduleResult {
  steps: ScheduledStep[];
  servingTime: Date;
  startTime: Date;
  totalDuration: number; // minutes from start to serving
  equipmentList: string[]; // deduplicated equipment
  warnings: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/**
 * Calculate the roasting duration for a meat cut based on weight and doneness.
 * For "per-weight": (minutesPerKg × actualWeightKg) + baseMinutes
 * For "fixed": returns the fixed minutes directly.
 */
export function calculateMeatRoastDuration(
  meatCut: MeatCut,
  actualWeightKg: number,
  doneness?: Doneness,
): number {
  const ct = meatCut.cookingTime;

  if (ct.type === "fixed") {
    return ct.minutes;
  }

  const perWeight = ct as CookingTimePerWeight;
  let donenessKey: Doneness | undefined = doneness;

  if (!donenessKey || !perWeight.doneness[donenessKey]) {
    // Use the only available doneness (e.g., chicken/pork have only "well-done")
    const keys = Object.keys(perWeight.doneness) as Doneness[];
    donenessKey = keys[0];
  }

  const donenessTime = perWeight.doneness[donenessKey!];
  if (!donenessTime) {
    // Malformed recipe data — no doneness entries. Use a safe fallback.
    return Math.round(40 * actualWeightKg + 20);
  }

  return Math.round(
    donenessTime.minutesPerKg * actualWeightKg + donenessTime.baseMinutes,
  );
}

// ─── Step Collection ────────────────────────────────────────────────

interface CollectedSteps {
  steps: RecipeStep[];
  dishNames: Map<string, string>;
  warnings: string[];
}

function collectAllSteps(
  config: MealConfig,
  meatCut: MeatCut,
): CollectedSteps {
  const allSteps: RecipeStep[] = [];
  const dishNames = new Map<string, string>();
  const warnings: string[] = [];
  const prepAhead = new Set(config.prepAheadSteps);

  // ── Meat steps ──
  dishNames.set(meatCut.id, meatCut.name);
  const roastDuration = calculateMeatRoastDuration(
    meatCut,
    config.meat.actualWeightKg,
    config.meat.doneness,
  );

  for (const step of meatCut.steps) {
    if (prepAhead.has(step.id)) continue;

    // The roasting step has durationMinutes: 0 as a placeholder — replace it
    if (step.durationMinutes === 0 && step.resource === "oven") {
      allSteps.push({ ...step, durationMinutes: roastDuration });
    } else {
      allSteps.push({ ...step });
    }
  }

  // ── Side steps (including gravy) ──
  const sideSelections = [
    ...config.sides,
    ...(config.gravy ? [config.gravy] : []),
  ];

  for (const sel of sideSelections) {
    if (sel.mode === "premade") continue;

    const side = getSide(sel.sideId);
    if (!side) {
      warnings.push(`Unknown side: ${sel.sideId}`);
      continue;
    }

    dishNames.set(side.id, side.name);

    // Use variant steps if a variant is selected, otherwise use the side's steps
    let steps: RecipeStep[];
    if (sel.variantId) {
      const variant = side.variants.find((v) => v.id === sel.variantId);
      steps = variant ? variant.steps : side.steps;
    } else {
      steps = side.steps;
    }

    for (const step of steps) {
      if (prepAhead.has(step.id)) continue;
      allSteps.push({ ...step });
    }
  }

  return { steps: allSteps, dishNames, warnings };
}

// ─── Topological Sort (Kahn's Algorithm) ────────────────────────────

interface TopoResult {
  sorted: RecipeStep[];
  hasCycle: boolean;
}

function topologicalSort(steps: RecipeStep[]): TopoResult {
  const stepMap = new Map<string, RecipeStep>();
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>(); // predecessor → successors

  for (const step of steps) {
    stepMap.set(step.id, step);
    inDegree.set(step.id, 0);
    adjList.set(step.id, []);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (stepMap.has(dep)) {
        adjList.get(dep)!.push(step.id);
        inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: RecipeStep[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(stepMap.get(id)!);
    for (const successor of adjList.get(id)!) {
      const newDegree = (inDegree.get(successor) ?? 0) - 1;
      inDegree.set(successor, newDegree);
      if (newDegree === 0) queue.push(successor);
    }
  }

  return { sorted, hasCycle: sorted.length !== steps.length };
}

// ─── Backward Scheduling ───────────────────────────────────────────

function backwardSchedule(
  steps: RecipeStep[],
  servingTime: Date,
): { startTimes: Map<string, Date>; endTimes: Map<string, Date> } {
  const startTimes = new Map<string, Date>();
  const endTimes = new Map<string, Date>();

  // Build successor map: stepId → [IDs of steps that depend on it]
  const successorMap = new Map<string, string[]>();
  for (const step of steps) {
    successorMap.set(step.id, []);
  }
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      successorMap.get(dep)?.push(step.id);
    }
  }

  // Topological sort, then process in reverse order (terminals first)
  const { sorted } = topologicalSort(steps);
  const reverseSorted = [...sorted].reverse();

  for (const step of reverseSorted) {
    const successors = successorMap.get(step.id) ?? [];

    let endTime: Date;
    if (successors.length === 0) {
      // Terminal step — ends at serving time
      endTime = servingTime;
    } else {
      // Must finish before the earliest successor starts
      endTime = new Date(
        Math.min(...successors.map((s) => startTimes.get(s)!.getTime())),
      );
    }

    endTimes.set(step.id, endTime);
    startTimes.set(step.id, addMinutes(endTime, -step.durationMinutes));
  }

  return { startTimes, endTimes };
}

// ─── Oven Conflict Resolution ──────────────────────────────────────

interface OvenConflict {
  stepToShift: string;
  shiftEndBefore: Date;
}

function findFirstOvenConflict(
  ovenSteps: RecipeStep[],
  startTimes: Map<string, Date>,
  endTimes: Map<string, Date>,
  ovenCavities: number,
): OvenConflict | null {
  // Sort by end time descending — steps ending closest to serving time are prioritised
  const sorted = [...ovenSteps].sort(
    (a, b) => endTimes.get(b.id)!.getTime() - endTimes.get(a.id)!.getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const later = sorted[i]; // ends later (closer to serving)
      const earlier = sorted[j]; // ends earlier

      const laterStart = startTimes.get(later.id)!;
      const earlierEnd = endTimes.get(earlier.id)!;

      // No overlap?
      if (earlierEnd.getTime() <= laterStart.getTime()) continue;

      // Same temperature can share a cavity
      if (later.ovenTempCelsius === earlier.ovenTempCelsius) continue;

      // Count distinct active oven temperatures during the overlap window
      const overlapStart = Math.max(
        startTimes.get(later.id)!.getTime(),
        startTimes.get(earlier.id)!.getTime(),
      );
      const overlapEnd = Math.min(
        endTimes.get(later.id)!.getTime(),
        endTimes.get(earlier.id)!.getTime(),
      );
      if (overlapStart >= overlapEnd) continue;

      const activeTemps = new Set<number>();
      for (const step of ovenSteps) {
        const sStart = startTimes.get(step.id)!.getTime();
        const sEnd = endTimes.get(step.id)!.getTime();
        if (
          sStart < overlapEnd &&
          sEnd > overlapStart &&
          step.ovenTempCelsius !== null
        ) {
          activeTemps.add(step.ovenTempCelsius);
        }
      }

      if (activeTemps.size > ovenCavities) {
        return {
          stepToShift: earlier.id,
          shiftEndBefore: laterStart,
        };
      }
    }
  }

  return null;
}

/**
 * Recursively shift all predecessors of a step backward so they
 * finish before the step's new start time.
 */
function cascadePredecessors(
  stepId: string,
  stepMap: Map<string, RecipeStep>,
  startTimes: Map<string, Date>,
  endTimes: Map<string, Date>,
): void {
  const step = stepMap.get(stepId);
  if (!step) return;

  const stepStart = startTimes.get(stepId)!;

  for (const depId of step.dependsOn) {
    const dep = stepMap.get(depId);
    if (!dep) continue;

    const depEnd = endTimes.get(depId)!;
    if (depEnd.getTime() > stepStart.getTime()) {
      endTimes.set(depId, stepStart);
      startTimes.set(depId, addMinutes(stepStart, -dep.durationMinutes));
      cascadePredecessors(depId, stepMap, startTimes, endTimes);
    }
  }
}

function resolveOvenConflicts(
  steps: RecipeStep[],
  startTimes: Map<string, Date>,
  endTimes: Map<string, Date>,
  ovenCavities: number,
  warnings: string[],
): void {
  if (ovenCavities <= 0) return;

  const ovenSteps = steps.filter((s) => s.resource === "oven");
  if (ovenSteps.length <= 1) return;

  const stepMap = new Map<string, RecipeStep>();
  for (const step of steps) {
    stepMap.set(step.id, step);
  }

  let iterations = 100;
  while (iterations-- > 0) {
    const conflict = findFirstOvenConflict(
      ovenSteps,
      startTimes,
      endTimes,
      ovenCavities,
    );
    if (!conflict) return;

    const { stepToShift, shiftEndBefore } = conflict;
    const step = stepMap.get(stepToShift)!;

    endTimes.set(stepToShift, shiftEndBefore);
    startTimes.set(
      stepToShift,
      addMinutes(shiftEndBefore, -step.durationMinutes),
    );

    cascadePredecessors(stepToShift, stepMap, startTimes, endTimes);
  }

  warnings.push("Oven conflicts could not be fully resolved");
}

// ─── Main Scheduler ─────────────────────────────────────────────────

export function generateSchedule(
  config: MealConfig,
  referenceDate: Date,
): ScheduleResult {
  const warnings: string[] = [];

  // Build serving datetime from reference date + HH:MM
  const [hours, minutes] = config.servingTime.split(":").map(Number);
  const servingTime = new Date(referenceDate);
  servingTime.setHours(hours, minutes, 0, 0);

  // Look up the selected meat cut
  const meatCut = getMeatCut(config.meat.cutId);
  if (!meatCut) {
    return {
      steps: [],
      servingTime,
      startTime: servingTime,
      totalDuration: 0,
      equipmentList: [],
      warnings: [`Unknown meat cut: ${config.meat.cutId}`],
    };
  }

  // Step 1: Collect all steps from meat + sides
  const { steps: rawSteps, dishNames, warnings: collectWarnings } =
    collectAllSteps(config, meatCut);
  warnings.push(...collectWarnings);

  if (rawSteps.length === 0) {
    return {
      steps: [],
      servingTime,
      startTime: servingTime,
      totalDuration: 0,
      equipmentList: [],
      warnings: [...warnings, "No steps to schedule"],
    };
  }

  // Check for missing dependencies (before cleaning)
  const stepIds = new Set(rawSteps.map((s) => s.id));
  const prepAhead = new Set(config.prepAheadSteps);
  for (const step of rawSteps) {
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep) && !prepAhead.has(dep)) {
        warnings.push(
          `Step "${step.id}" depends on missing step "${dep}"`,
        );
      }
    }
  }

  // Remove references to dependencies that were filtered out
  const cleanedSteps = rawSteps.map((step) => ({
    ...step,
    dependsOn: step.dependsOn.filter((dep) => stepIds.has(dep)),
  }));

  // Step 2: Topological sort
  const { sorted, hasCycle } = topologicalSort(cleanedSteps);
  if (hasCycle) {
    warnings.push("Dependency cycle detected — schedule may be incorrect");
  }

  // Step 3: Backward schedule from serving time
  const { startTimes, endTimes } = backwardSchedule(cleanedSteps, servingTime);

  // Step 4: Resolve oven conflicts
  resolveOvenConflicts(
    cleanedSteps,
    startTimes,
    endTimes,
    config.ovenCavities,
    warnings,
  );

  // Step 5: Build ScheduledStep array
  const scheduledSteps: ScheduledStep[] = sorted.map((step) => ({
    stepId: step.id,
    dishId: step.dishId,
    dishName: dishNames.get(step.dishId) ?? step.dishId,
    summary: step.summary,
    instruction: step.instruction,
    startTime: startTimes.get(step.id)!,
    endTime: endTimes.get(step.id)!,
    durationMinutes: step.durationMinutes,
    resource: step.resource,
    ovenTempCelsius: step.ovenTempCelsius,
    requiredEquipment: step.requiredEquipment,
    tags: step.tags,
    canPrepAhead: step.canPrepAhead,
    isPrepAhead: false,
  }));

  // Sort by start time
  scheduledSteps.sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
  );

  // Step 6: Aggregate equipment (deduplicated)
  const equipmentSet = new Set<string>();
  for (const step of scheduledSteps) {
    for (const eq of step.requiredEquipment) {
      equipmentSet.add(eq);
    }
  }

  // Step 7: Compute totals and generate warnings
  const startTime =
    scheduledSteps.length > 0
      ? new Date(
          Math.min(...scheduledSteps.map((s) => s.startTime.getTime())),
        )
      : servingTime;
  const totalDuration = Math.round(
    (servingTime.getTime() - startTime.getTime()) / 60_000,
  );

  if (totalDuration > 360) {
    warnings.push("Total cooking time exceeds 6 hours");
  }

  return {
    steps: scheduledSteps,
    servingTime,
    startTime,
    totalDuration,
    equipmentList: [...equipmentSet],
    warnings,
  };
}
