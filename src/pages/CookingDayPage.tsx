import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ArrowLeft, ArrowRight, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMeatCut } from "@/data";
import type { OvenTempDisplay } from "@/types/recipe";

const CAVITY_OPTIONS = [
  { value: 0, label: "No Oven", description: "Hob only" },
  { value: 1, label: "1 Oven", description: "Standard oven" },
  { value: 2, label: "2 Ovens", description: "Double oven" },
  { value: 3, label: "3+", description: "Range cooker" },
];

const OVEN_TEMP_OPTIONS: { value: OvenTempDisplay; label: string }[] = [
  { value: "celsius-fan", label: "Celsius (Fan)" },
  { value: "celsius-conventional", label: "Celsius (Conventional)" },
  { value: "gas-mark", label: "Gas Mark" },
];

export default function CookingDayPage() {
  const navigate = useNavigate();
  const {
    state,
    setOvenCavities,
    setActualWeightKg,
    setServingTime,
    setOvenTempDisplay,
  } = useMealConfig();

  const meatCut = useMemo(
    () => (state.meatCutId ? getMeatCut(state.meatCutId) : null),
    [state.meatCutId],
  );

  const suggestedWeight = meatCut
    ? +(meatCut.weightPerPersonKg * state.servings).toFixed(2)
    : null;

  const displayWeight = state.actualWeightKg ?? suggestedWeight;

  const sidesCount = state.sides.length;

  const canProceed =
    !!state.meatCutId &&
    (state.actualWeightKg ?? suggestedWeight) !== null &&
    !!state.servingTime &&
    state.ovenCavities >= 0;

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-6 pb-28">
      <StepIndicator currentPath="/cooking-day" />

      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Cooking Day
      </h1>

      {/* Summary */}
      {meatCut && (
        <p className="mt-1 text-muted-foreground">
          You&rsquo;re cooking{" "}
          <span className="font-medium text-foreground">{meatCut.name}</span>
          {" "}for{" "}
          <span className="font-medium text-foreground">
            {state.servings} {state.servings === 1 ? "person" : "people"}
          </span>
          {sidesCount > 0 && (
            <>
              {" "}with{" "}
              <span className="font-medium text-foreground">
                {sidesCount} {sidesCount === 1 ? "side" : "sides"}
              </span>
            </>
          )}
        </p>
      )}

      {/* ── Oven Cavities ───────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardContent className="pt-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Oven Cavities</h2>
            <Tooltip>
              <TooltipTrigger className="inline-flex" aria-label="More info about oven cavities">
                <HelpCircle className="size-4 text-muted-foreground" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                A standard kitchen oven has 1 cavity. A double oven or range
                cooker (like an AGA or Rangemaster) has 2 or more. This helps us
                plan which dishes can cook at the same time.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            How many independent oven compartments do you have?
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Number of oven cavities">
            {CAVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setOvenCavities(opt.value)}
                role="radio"
                aria-checked={state.ovenCavities === opt.value}
                className={cn(
                  "flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-all active:scale-[0.97]",
                  state.ovenCavities === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                )}
              >
                <span className="text-lg font-bold">{opt.label}</span>
                <span className="text-xs text-muted-foreground">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Actual Joint Weight ─────────────────────────────────────── */}
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
              aria-label="Joint weight in kilograms"
            />
            <span className="text-lg text-muted-foreground">kg</span>
          </div>
          {suggestedWeight && !state.actualWeightKg && (
            <p className="mt-2 text-sm text-muted-foreground">
              Suggested: {suggestedWeight}kg based on {state.servings} servings
            </p>
          )}
        </CardContent>
      </Card>

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
            aria-label="Serving time"
          />
        </CardContent>
      </Card>

      {/* ── Temperature Display Preference ──────────────────────────── */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Temperature Display Preference</CardTitle>
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
          onClick={() => navigate("/shopping")}
          className="min-h-[48px] gap-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Shopping
        </Button>
        <Button
          size="lg"
          onClick={() => navigate("/review")}
          disabled={!canProceed}
          className="min-h-[48px] gap-2 px-6 text-base"
        >
          Review Plan
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </main>
  );
}
