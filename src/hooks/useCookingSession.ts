import { useState, useEffect, useCallback } from "react";
import type { ScheduleResult, ScheduledStep } from "@/lib/scheduler";

// ─── Types ──────────────────────────────────────────────────────────

export interface CookingSession {
  isActive: boolean;
  startedAt: Date | null;
  schedule: ScheduleResult | null;
  completedStepIds: string[];
  skippedDishIds: string[];
  lateOffsetMinutes: number;

  startSession: (schedule: ScheduleResult) => void;
  completeStep: (stepId: string) => void;
  uncompleteStep: (stepId: string) => void;
  skipDish: (dishId: string) => void;
  adjustLateOffset: (minutes: number) => void;
  endSession: () => void;
}

// ─── Serialization ──────────────────────────────────────────────────

interface StoredSession {
  isActive: boolean;
  startedAt: string | null;
  scheduleJson: string | null;
  completedStepIds: string[];
  skippedDishIds: string[];
  lateOffsetMinutes: number;
}

const STORAGE_KEY = "roast-dinner-cooking-session";

function rehydrateSchedule(json: string): ScheduleResult {
  const data = JSON.parse(json);
  if (!data || !Array.isArray(data.steps)) {
    throw new Error("Invalid schedule data");
  }
  return {
    ...data,
    servingTime: new Date(data.servingTime),
    startTime: new Date(data.startTime),
    steps: data.steps.map((s: ScheduledStep & { startTime: string; endTime: string }) => ({
      ...s,
      startTime: new Date(s.startTime),
      endTime: new Date(s.endTime),
    })),
  };
}

function loadSession(): {
  isActive: boolean;
  startedAt: Date | null;
  schedule: ScheduleResult | null;
  completedStepIds: string[];
  skippedDishIds: string[];
  lateOffsetMinutes: number;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const stored: StoredSession = JSON.parse(raw);
    return {
      isActive: stored.isActive,
      startedAt: stored.startedAt ? new Date(stored.startedAt) : null,
      schedule: stored.scheduleJson
        ? rehydrateSchedule(stored.scheduleJson)
        : null,
      completedStepIds: stored.completedStepIds ?? [],
      skippedDishIds: stored.skippedDishIds ?? [],
      lateOffsetMinutes: stored.lateOffsetMinutes ?? 0,
    };
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    isActive: false,
    startedAt: null as Date | null,
    schedule: null as ScheduleResult | null,
    completedStepIds: [] as string[],
    skippedDishIds: [] as string[],
    lateOffsetMinutes: 0,
  };
}

function saveSession(state: ReturnType<typeof defaultState>): void {
  const stored: StoredSession = {
    isActive: state.isActive,
    startedAt: state.startedAt?.toISOString() ?? null,
    scheduleJson: state.schedule ? JSON.stringify(state.schedule) : null,
    completedStepIds: state.completedStepIds,
    skippedDishIds: state.skippedDishIds,
    lateOffsetMinutes: state.lateOffsetMinutes,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useCookingSession(): CookingSession {
  const [state, setState] = useState(loadSession);

  // Persist every state change
  useEffect(() => {
    saveSession(state);
  }, [state]);

  const startSession = useCallback((schedule: ScheduleResult) => {
    const newState = {
      isActive: true,
      startedAt: new Date(),
      schedule,
      completedStepIds: [] as string[],
      skippedDishIds: [] as string[],
      lateOffsetMinutes: 0,
    };
    // Save synchronously so the session is available immediately after navigation
    saveSession(newState);
    setState(newState);
  }, []);

  const completeStep = useCallback((stepId: string) => {
    setState((prev) => ({
      ...prev,
      completedStepIds: prev.completedStepIds.includes(stepId)
        ? prev.completedStepIds
        : [...prev.completedStepIds, stepId],
    }));
  }, []);

  const uncompleteStep = useCallback((stepId: string) => {
    setState((prev) => ({
      ...prev,
      completedStepIds: prev.completedStepIds.filter((id) => id !== stepId),
    }));
  }, []);

  const skipDish = useCallback((dishId: string) => {
    setState((prev) => ({
      ...prev,
      skippedDishIds: prev.skippedDishIds.includes(dishId)
        ? prev.skippedDishIds
        : [...prev.skippedDishIds, dishId],
    }));
  }, []);

  const adjustLateOffset = useCallback((minutes: number) => {
    setState((prev) => ({
      ...prev,
      lateOffsetMinutes: prev.lateOffsetMinutes + minutes,
    }));
  }, []);

  const endSession = useCallback(() => {
    setState(defaultState());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isActive: state.isActive,
    startedAt: state.startedAt,
    schedule: state.schedule,
    completedStepIds: state.completedStepIds,
    skippedDishIds: state.skippedDishIds,
    lateOffsetMinutes: state.lateOffsetMinutes,
    startSession,
    completeStep,
    uncompleteStep,
    skipDish,
    adjustLateOffset,
    endSession,
  };
}
