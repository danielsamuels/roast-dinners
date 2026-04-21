import { useNavigate } from "react-router-dom";
import { useMealConfig } from "@/hooks/useMealConfig";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { ChefHat, HelpCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CAVITY_OPTIONS = [
  { value: 0, label: "No Oven", description: "Hob only" },
  { value: 1, label: "1 Oven", description: "Standard oven" },
  { value: 2, label: "2 Ovens", description: "Double oven" },
  { value: 3, label: "3+", description: "Range cooker" },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const { state, setOvenCavities } = useMealConfig();

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-6">
      <StepIndicator currentPath="/" />

      {/* Hero */}
      <div className="mt-8 flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <ChefHat className="size-8 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Plan Your Roast Dinner
        </h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          We&rsquo;ll help you time everything perfectly. First, let&rsquo;s set
          up your kitchen.
        </p>
      </div>

      {/* Oven cavities */}
      <Card className="mt-8">
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

      {/* Navigation */}
      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          onClick={() => navigate("/configure")}
          className="min-h-[48px] gap-2 px-6 text-base"
        >
          Next
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </main>
  );
}
