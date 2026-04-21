import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  OvenTempDisplay,
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

const OVEN_TEMP_OPTIONS: { value: OvenTempDisplay; label: string }[] = [
  { value: "celsius-fan", label: "Celsius (Fan)" },
  { value: "celsius-conventional", label: "Celsius (Conventional)" },
  { value: "gas-mark", label: "Gas Mark" },
];

// ─── Component ──────────────────────────────────────────────────────

export default function ConfigurePage() {
  const navigate = useNavigate();
  const {
    state,
    setMeatCutId,
    setDoneness,
    setServings,
    setActualWeightKg,
    setServingTime,
    toggleSide,
    updateSide,
    toggleCondiment,
    setOvenTempDisplay,
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

  // Suggested weight based on per-person rate × servings
  const suggestedWeight = selectedCut
    ? +(selectedCut.weightPerPersonKg * state.servings).toFixed(2)
    : null;

  const displayWeight = state.actualWeightKg ?? suggestedWeight;

  // Condiments for the selected meat
  const meatCondiments = selectedMeatType
    ? getCondimentsForMeat(selectedMeatType)
    : [];

  // Group sides by category
  const sidesByCategory = useMemo(() => {
    const map = new Map<SideCategory, typeof allSides>();
    for (const cat of SIDE_CATEGORY_ORDER) {
      map.set(cat, []);
    }
    for (const side of allSides) {
      const list = map.get(side.category)!;
      list.push(side);
    }
    return map;
  }, [allSides]);

  const canProceed =
    !!state.meatCutId && state.servings > 0 && !!state.servingTime;

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
    <div className="container mx-auto max-w-2xl px-4 py-6 pb-28">
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
            >
              <Plus className="size-5" />
            </Button>
          </div>
          {suggestedWeight && (
            <p className="mt-3 text-sm text-muted-foreground">
              Suggested joint weight:{" "}
              <span className="font-medium text-foreground">
                {suggestedWeight}kg
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Actual Joint Weight ─────────────────────────────────────── */}
      {selectedCut && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Actual Joint Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Enter the weight of the joint you actually bought.
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="20"
                value={displayWeight ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setActualWeightKg(val ? parseFloat(val) : null);
                }}
                placeholder={suggestedWeight?.toString() ?? ""}
                className="h-12 max-w-[150px] text-lg"
              />
              <span className="text-lg text-muted-foreground">kg</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Serving Time ────────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>What Time Are You Serving?</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="time"
            value={state.servingTime}
            onChange={(e) => setServingTime(e.target.value)}
            className="h-12 max-w-[180px] text-lg"
          />
        </CardContent>
      </Card>

      {/* ── Sides & Accompaniments ──────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sides &amp; Accompaniments</CardTitle>
        </CardHeader>
        <CardContent>
          {SIDE_CATEGORY_ORDER.map((cat, catIdx) => {
            const catSides = sidesByCategory.get(cat) ?? [];
            if (catSides.length === 0) return null;
            return (
              <div key={cat}>
                {catIdx > 0 && <Separator className="my-4" />}
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {SIDE_CATEGORY_LABELS[cat]}
                </h3>
                <div className="space-y-2">
                  {catSides.map((side) => {
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
                        {/* Toggle row */}
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

                        {/* Sub-options when toggled on */}
                        {isSelected && (
                          <div className="mt-3 ml-9 space-y-3">
                            {/* Variant selector */}
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

                            {/* Homemade / Pre-made toggle */}
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

      {/* ── Oven Temperature Display ────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Oven Temperature Display</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.ovenTempDisplay}
            onValueChange={(val: unknown) =>
              setOvenTempDisplay(val as OvenTempDisplay)
            }
          >
            {OVEN_TEMP_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-3 py-1">
                <RadioGroupItem value={opt.value} id={`temp-${opt.value}`} />
                <Label htmlFor={`temp-${opt.value}`} className="cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => navigate("/")}
          className="min-h-[48px] gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={() => navigate("/shopping")}
          disabled={!canProceed}
          className="min-h-[48px] gap-2 px-6 text-base"
        >
          View Shopping List
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
