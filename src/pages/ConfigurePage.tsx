import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMeatCuts, getSides, getCondimentsForMeat } from "@/data";
import type {
  MeatType,
  Doneness,
  MeatCut,
  SideCategory,
} from "@/types/recipe";

// ─── Static Data ────────────────────────────────────────────────────

const MEAT_TYPES: { type: MeatType; label: string; emoji: string }[] = [
  { type: "chicken", label: "Chicken", emoji: "🍗" },
  { type: "beef", label: "Beef", emoji: "🥩" },
  { type: "lamb", label: "Lamb", emoji: "🍖" },
  { type: "pork", label: "Pork", emoji: "🐖" },
];

const DONENESS_LEVELS: { value: Doneness; label: string; color: string }[] = [
  { value: "rare", label: "Rare", color: "bg-red-600" },
  { value: "medium-rare", label: "Medium Rare", color: "bg-red-400" },
  { value: "medium", label: "Medium", color: "bg-rose-300" },
  { value: "medium-well", label: "Medium Well", color: "bg-amber-300" },
  { value: "well-done", label: "Well Done", color: "bg-amber-200" },
];

const SIDE_CATEGORY_LABELS: Record<SideCategory, string> = {
  staple: "Staples",
  vegetable: "Vegetables",
  extra: "Extras",
};

const SIDE_CATEGORY_ORDER: SideCategory[] = ["staple", "vegetable", "extra"];

// ─── Component ──────────────────────────────────────────────────────

export default function ConfigurePage() {
  const navigate = useNavigate();
  const {
    state,
    setMeatCutId,
    setDoneness,
    setServings,
    toggleSide,
    updateSide,
    toggleCondiment,
  } = useMealConfig();

  // Track which meat type the user has expanded (for multi-cut selection)
  const [activeMeatType, setActiveMeatType] = useState<MeatType | null>(null);

  const allCuts = getMeatCuts();
  const allSides = getSides();

  // Group cuts by meat type
  const cutsByMeat = useMemo(() => {
    const map = new Map<MeatType, MeatCut[]>();
    for (const cut of allCuts) {
      const list = map.get(cut.meat) ?? [];
      list.push(cut);
      map.set(cut.meat, list);
    }
    return map;
  }, [allCuts]);

  const selectedCut = allCuts.find((c) => c.id === state.meatCutId);
  const selectedMeatType = selectedCut?.meat ?? null;
  const displayedMeatType = activeMeatType ?? selectedMeatType;

  const availableMeatTypes = useMemo(
    () => new Set(allCuts.map((c) => c.meat)),
    [allCuts],
  );

  // Condiments for the selected meat
  const meatCondiments = selectedMeatType
    ? getCondimentsForMeat(selectedMeatType)
    : [];

  // Map of vegetable base name → group label for multi-variant sides
  const SIDE_GROUP_LABELS: Record<string, string> = {
    carrots: "Carrots",
    "brussels-sprouts": "Brussels Sprouts",
  };

  // Determine the group key for a side (e.g., "carrots-steamed" → "carrots")
  function getSideGroupKey(sideId: string): string {
    for (const prefix of Object.keys(SIDE_GROUP_LABELS)) {
      if (sideId.startsWith(prefix + "-")) return prefix;
    }
    return sideId; // ungrouped sides are their own group
  }

  interface SideGroup {
    groupKey: string;
    label: string;
    sides: typeof allSides;
    isMulti: boolean;
  }

  // Group sides by category, then by vegetable group within each category
  const groupedSidesByCategory = useMemo(() => {
    const result = new Map<SideCategory, SideGroup[]>();
    for (const cat of SIDE_CATEGORY_ORDER) {
      result.set(cat, []);
    }
    // First, group all sides by their group key within each category
    const catGroupMap = new Map<SideCategory, Map<string, typeof allSides>>();
    for (const cat of SIDE_CATEGORY_ORDER) {
      catGroupMap.set(cat, new Map());
    }
    for (const side of allSides) {
      const groupKey = getSideGroupKey(side.id);
      const catMap = catGroupMap.get(side.category)!;
      const list = catMap.get(groupKey) ?? [];
      list.push(side);
      catMap.set(groupKey, list);
    }
    // Convert to SideGroup arrays
    for (const cat of SIDE_CATEGORY_ORDER) {
      const catMap = catGroupMap.get(cat)!;
      const groups: SideGroup[] = [];
      for (const [groupKey, sides] of catMap) {
        groups.push({
          groupKey,
          label: SIDE_GROUP_LABELS[groupKey] ?? sides[0].name,
          sides,
          isMulti: sides.length > 1,
        });
      }
      result.set(cat, groups);
    }
    return result;
  }, [allSides]);

  const canProceed = !!state.meatCutId && state.servings > 0;

  const handleMeatTypeClick = (meatType: MeatType) => {
    const cuts = cutsByMeat.get(meatType) ?? [];

    if (cuts.length === 1) {
      // Single cut — toggle selection
      if (state.meatCutId === cuts[0].id) {
        setMeatCutId(null);
        setActiveMeatType(null);
      } else {
        setMeatCutId(cuts[0].id);
        setActiveMeatType(meatType);
      }
    } else {
      // Multiple cuts — expand / collapse the type panel
      setActiveMeatType(activeMeatType === meatType ? null : meatType);
    }
  };

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-6 pb-28">
      <StepIndicator currentPath="/configure" />

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Configure Your Meal
      </h1>
      <p className="mt-1 text-muted-foreground">
        Choose your meat, sides, and set your serving time.
      </p>

      {/* ── Choose Your Meat ────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Choose Your Meat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MEAT_TYPES.map(({ type, label, emoji }) => {
              const hasData = availableMeatTypes.has(type);
              const isSelected = selectedMeatType === type;
              return (
                <button
                  key={type}
                  onClick={() => hasData && handleMeatTypeClick(type)}
                  disabled={!hasData}
                  className={cn(
                    "flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 transition-all active:scale-[0.97]",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : hasData
                        ? "border-border hover:border-primary/50 hover:bg-muted/50"
                        : "cursor-not-allowed border-border opacity-40",
                  )}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      isSelected && "text-primary",
                    )}
                  >
                    {label}
                  </span>
                  {!hasData && (
                    <span className="text-[10px] text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Cut selector when meat type has multiple cuts */}
          {displayedMeatType &&
            (cutsByMeat.get(displayedMeatType)?.length ?? 0) > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-sm text-muted-foreground">
                  Select a cut
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {cutsByMeat.get(displayedMeatType)!.map((cut) => (
                    <button
                      key={cut.id}
                      onClick={() => setMeatCutId(cut.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
                        state.meatCutId === cut.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div>
                        <div className="font-medium">{cut.name}</div>
                        <div className="text-xs text-muted-foreground">
                          ~{cut.weightPerPersonKg}kg per person
                        </div>
                      </div>
                      {state.meatCutId === cut.id && (
                        <Check className="ml-auto size-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

          {/* Selected cut badge */}
          {selectedCut && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary">{selectedCut.name}</Badge>
              <button
                onClick={() => {
                  setMeatCutId(null);
                  setActiveMeatType(null);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Change
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Doneness ────────────────────────────────────────────────── */}
      {selectedCut?.supportsDonenessSelection && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Doneness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DONENESS_LEVELS.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setDoneness(value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all active:scale-[0.97]",
                    state.doneness === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span className={cn("h-3 w-3 rounded-full", color)} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── How Many People? ────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>How Many People?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setServings(Math.max(1, state.servings - 1))}
              disabled={state.servings <= 1}
              className="h-12 w-12"
              aria-label="Decrease servings"
            >
              <Minus className="size-5" />
            </Button>
            <div className="flex min-w-[60px] flex-col items-center">
              <span className="text-3xl font-bold">{state.servings}</span>
              <span className="text-xs text-muted-foreground">
                {state.servings === 1 ? "person" : "people"}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setServings(Math.min(12, state.servings + 1))}
              disabled={state.servings >= 12}
              className="h-12 w-12"
              aria-label="Increase servings"
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Sides & Accompaniments ──────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sides &amp; Accompaniments</CardTitle>
        </CardHeader>
        <CardContent>
          {SIDE_CATEGORY_ORDER.map((cat, catIdx) => {
            const catGroups = groupedSidesByCategory.get(cat) ?? [];
            if (catGroups.length === 0) return null;
            return (
              <div key={cat}>
                {catIdx > 0 && <Separator className="my-4" />}
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {SIDE_CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-2">
                  {catGroups.map((group) => {
                    if (group.isMulti) {
                      // Multi-variant group (e.g., Carrots → Steamed / Honey Roasted)
                      const selectedSide = group.sides.find((s) =>
                        state.sides.some((sel) => sel.sideId === s.id),
                      );
                      const isGroupSelected = !!selectedSide;
                      const selection = selectedSide
                        ? state.sides.find((s) => s.sideId === selectedSide.id)
                        : null;

                      // Extract the cooking style from the side name (e.g., "Honey Roasted Carrots" → "Honey Roasted")
                      const styleLabel = (side: typeof group.sides[0]) => {
                        const label = side.name
                          .replace(group.label, "")
                          .replace(/^\s+|\s+$/g, "");
                        return label || side.name;
                      };

                      return (
                        <div
                          key={group.groupKey}
                          className={cn(
                            "rounded-lg border p-3 transition-colors",
                            isGroupSelected && "border-primary/30 bg-primary/[0.02]",
                          )}
                        >
                          <button
                            onClick={() => {
                              if (isGroupSelected && selectedSide) {
                                toggleSide(selectedSide.id);
                              } else {
                                toggleSide(group.sides[0].id);
                              }
                            }}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            <div
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                                isGroupSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border",
                              )}
                            >
                              {isGroupSelected && <Check className="size-4" />}
                            </div>
                            <span className="font-medium">{group.label}</span>
                          </button>

                          {isGroupSelected && (
                            <div className="mt-3 ml-9 space-y-3">
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Style
                                </Label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {group.sides.map((side) => (
                                    <button
                                      key={side.id}
                                      onClick={() => {
                                        // Deselect old, select new
                                        if (selectedSide && selectedSide.id !== side.id) {
                                          toggleSide(selectedSide.id);
                                        }
                                        if (!state.sides.some((s) => s.sideId === side.id)) {
                                          toggleSide(side.id);
                                        }
                                      }}
                                      className={cn(
                                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                        selectedSide?.id === side.id
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:bg-muted",
                                      )}
                                    >
                                      {styleLabel(side)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {/* Homemade / Pre-made toggle for the selected variant */}
                              {selectedSide?.homemadeAvailable && selectedSide?.preMadeOption && (
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Preparation
                                  </Label>
                                  <div className="mt-1 flex gap-2">
                                    <button
                                      onClick={() =>
                                        updateSide(selectedSide.id, { mode: "homemade" })
                                      }
                                      className={cn(
                                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                        selection?.mode === "homemade"
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:bg-muted",
                                      )}
                                    >
                                      🍳 Homemade
                                    </button>
                                    <button
                                      onClick={() =>
                                        updateSide(selectedSide.id, { mode: "premade" })
                                      }
                                      className={cn(
                                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                        selection?.mode === "premade"
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:bg-muted",
                                      )}
                                    >
                                      🛒 Pre-made
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // Single-item group — original behavior
                    const side = group.sides[0];
                    const selection = state.sides.find(
                      (s) => s.sideId === side.id,
                    );
                    const isSelected = !!selection;
                    return (
                      <div
                        key={side.id}
                        className={cn(
                          "rounded-lg border p-3 transition-colors",
                          isSelected && "border-primary/30 bg-primary/[0.02]",
                        )}
                      >
                        <button
                          onClick={() => toggleSide(side.id)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <div
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {isSelected && <Check className="size-4" />}
                          </div>
                          <span className="font-medium">{side.name}</span>
                        </button>

                        {isSelected && (side.variants.length > 0 || (side.homemadeAvailable && side.preMadeOption)) && (
                          <div className="mt-3 ml-9 space-y-3">
                            {side.variants.length > 0 && (
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Style
                                </Label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {side.variants.map((v) => (
                                    <button
                                      key={v.id}
                                      onClick={() =>
                                        updateSide(side.id, {
                                          variantId: v.id,
                                        })
                                      }
                                      className={cn(
                                        "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                        selection?.variantId === v.id
                                          ? "border-primary bg-primary/10 text-primary"
                                          : "border-border hover:bg-muted",
                                      )}
                                    >
                                      {v.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {side.homemadeAvailable && side.preMadeOption && (
                              <div>
                                <Label className="text-xs text-muted-foreground">
                                  Preparation
                                </Label>
                                <div className="mt-1 flex gap-2">
                                  <button
                                    onClick={() =>
                                      updateSide(side.id, { mode: "homemade" })
                                    }
                                    className={cn(
                                      "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                      selection?.mode === "homemade"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-muted",
                                    )}
                                  >
                                    🍳 Homemade
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateSide(side.id, { mode: "premade" })
                                    }
                                    className={cn(
                                      "rounded-md border px-3 py-1.5 text-xs transition-colors",
                                      selection?.mode === "premade"
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border hover:bg-muted",
                                    )}
                                  >
                                    🛒 Pre-made
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Condiments ──────────────────────────────────────────────── */}
      {meatCondiments.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Condiments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Suggested for {selectedMeatType} — added to your shopping list.
            </p>
            <div className="space-y-2">
              {meatCondiments.map((c) => {
                const isChecked = state.condiments.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCondiment(c.id)}
                    className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        isChecked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isChecked && <Check className="size-4" />}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/")}
          className="min-h-[48px] gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={() => navigate("/shopping")}
          disabled={!canProceed}
          className="min-h-[48px] gap-2 px-6 text-base"
        >
          View Shopping List
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </main>
  );
}