import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Doneness, OvenTempDisplay, SideSelection } from "@/types/recipe";

// ─── State Shape ────────────────────────────────────────────────────

export interface MealConfigState {
  ovenCavities: number;
  meatCutId: string | null;
  doneness: Doneness | null;
  servings: number;
  actualWeightKg: number | null;
  servingTime: string; // HH:MM
  sides: SideSelection[];
  condiments: string[];
  gravy: SideSelection | null;
  ovenTempDisplay: OvenTempDisplay;
  prepAheadSteps: string[];
  checkedShoppingItems: string[];
}

const STORAGE_KEY = "roast-dinner-config";

const defaultState: MealConfigState = {
  ovenCavities: 1,
  meatCutId: null,
  doneness: null,
  servings: 4,
  actualWeightKg: null,
  servingTime: "13:00",
  sides: [],
  condiments: [],
  gravy: null,
  ovenTempDisplay: "celsius-fan",
  prepAheadSteps: [],
  checkedShoppingItems: [],
};

function loadState(): MealConfigState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultState, ...JSON.parse(stored) };
    }
  } catch {
    // corrupted storage — start fresh
  }
  return defaultState;
}

// ─── Context ────────────────────────────────────────────────────────

interface MealConfigContextValue {
  state: MealConfigState;
  setOvenCavities: (n: number) => void;
  setMeatCutId: (id: string | null) => void;
  setDoneness: (d: Doneness | null) => void;
  setServings: (n: number) => void;
  setActualWeightKg: (w: number | null) => void;
  setServingTime: (t: string) => void;
  setSides: (s: SideSelection[]) => void;
  toggleSide: (sideId: string) => void;
  updateSide: (sideId: string, updates: Partial<SideSelection>) => void;
  setCondiments: (c: string[]) => void;
  toggleCondiment: (id: string) => void;
  setGravy: (g: SideSelection | null) => void;
  setOvenTempDisplay: (d: OvenTempDisplay) => void;
  setPrepAheadSteps: (s: string[]) => void;
  toggleShoppingItem: (id: string) => void;
  setCheckedShoppingItems: (items: string[]) => void;
  resetConfig: () => void;
}

const MealConfigContext = createContext<MealConfigContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────

export function MealConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MealConfigState>(loadState);

  // Persist to localStorage on every state change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((partial: Partial<MealConfigState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const setOvenCavities = useCallback(
    (ovenCavities: number) => update({ ovenCavities }),
    [update],
  );

  // Selecting a new meat cut resets doneness and actual weight
  const setMeatCutId = useCallback(
    (meatCutId: string | null) =>
      update({ meatCutId, doneness: null, actualWeightKg: null }),
    [update],
  );

  const setDoneness = useCallback(
    (doneness: Doneness | null) => update({ doneness }),
    [update],
  );

  const setServings = useCallback(
    (servings: number) => update({ servings }),
    [update],
  );

  const setActualWeightKg = useCallback(
    (actualWeightKg: number | null) => update({ actualWeightKg }),
    [update],
  );

  const setServingTime = useCallback(
    (servingTime: string) => update({ servingTime }),
    [update],
  );

  const setSides = useCallback(
    (sides: SideSelection[]) => update({ sides }),
    [update],
  );

  const toggleSide = useCallback((sideId: string) => {
    setState((prev) => {
      const exists = prev.sides.find((s) => s.sideId === sideId);
      if (exists) {
        return { ...prev, sides: prev.sides.filter((s) => s.sideId !== sideId) };
      }
      return {
        ...prev,
        sides: [...prev.sides, { sideId, mode: "homemade" as const }],
      };
    });
  }, []);

  const updateSide = useCallback(
    (sideId: string, updates: Partial<SideSelection>) => {
      setState((prev) => ({
        ...prev,
        sides: prev.sides.map((s) =>
          s.sideId === sideId ? { ...s, ...updates } : s,
        ),
      }));
    },
    [],
  );

  const setCondiments = useCallback(
    (condiments: string[]) => update({ condiments }),
    [update],
  );

  const toggleCondiment = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      condiments: prev.condiments.includes(id)
        ? prev.condiments.filter((c) => c !== id)
        : [...prev.condiments, id],
    }));
  }, []);

  const setGravy = useCallback(
    (gravy: SideSelection | null) => update({ gravy }),
    [update],
  );

  const setOvenTempDisplay = useCallback(
    (ovenTempDisplay: OvenTempDisplay) => update({ ovenTempDisplay }),
    [update],
  );

  const setPrepAheadSteps = useCallback(
    (prepAheadSteps: string[]) => update({ prepAheadSteps }),
    [update],
  );

  const toggleShoppingItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      checkedShoppingItems: prev.checkedShoppingItems.includes(id)
        ? prev.checkedShoppingItems.filter((i) => i !== id)
        : [...prev.checkedShoppingItems, id],
    }));
  }, []);

  const setCheckedShoppingItems = useCallback(
    (checkedShoppingItems: string[]) => update({ checkedShoppingItems }),
    [update],
  );

  const resetConfig = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <MealConfigContext.Provider
      value={{
        state,
        setOvenCavities,
        setMeatCutId,
        setDoneness,
        setServings,
        setActualWeightKg,
        setServingTime,
        setSides,
        toggleSide,
        updateSide,
        setCondiments,
        toggleCondiment,
        setGravy,
        setOvenTempDisplay,
        setPrepAheadSteps,
        toggleShoppingItem,
        setCheckedShoppingItems,
        resetConfig,
      }}
    >
      {children}
    </MealConfigContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useMealConfig() {
  const ctx = useContext(MealConfigContext);
  if (!ctx) {
    throw new Error("useMealConfig must be used within a MealConfigProvider");
  }
  return ctx;
}
