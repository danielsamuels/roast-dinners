import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Pencil,
  AlertTriangle,
  Clock,
  Flame,
} from "lucide-react";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useCookingSession } from "@/hooks/useCookingSession";
import { StepIndicator } from "@/components/StepIndicator";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { generateSchedule } from "@/lib/scheduler";
import { buildMealConfig } from "@/lib/config";
import { displayTemp } from "@/lib/temperature";
import { getMeatCut } from "@/data";
import {
  buildDishColorMap,
  formatTime,
  formatDuration,
  resourceIcon,
  friendlyEquipmentName,
  groupStepsByTime,
} from "@/lib/cooking-utils";

export default function ReviewPage() {
  const navigate = useNavigate();
  const { state } = useMealConfig();
  const session = useCookingSession();
  const [checkedEquipment, setCheckedEquipment] = useState<Set<string>>(
    new Set(),
  );
  const [equipmentOpen, setEquipmentOpen] = useState(true);
  const [timingWarningOpen, setTimingWarningOpen] = useState(false);

  const config = useMemo(() => buildMealConfig(state), [state]);

  const schedule = useMemo(() => {
    if (!config) return null;
    return generateSchedule(config, new Date());
  }, [config]);

  const meatCut = useMemo(
    () => (state.meatCutId ? getMeatCut(state.meatCutId) : null),
    [state.meatCutId],
  );

  const dishColorMap = useMemo(
    () => (schedule ? buildDishColorMap(schedule.steps) : new Map()),
    [schedule],
  );

  const timelineGroups = useMemo(
    () => (schedule ? groupStepsByTime(schedule.steps) : []),
    [schedule],
  );

  const toggleEquipment = (id: string) => {
    setCheckedEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartCooking = () => {
    if (!schedule || !config) return;

    const now = Date.now();
    const scheduledStart = schedule.startTime.getTime();
    const tolerance = 15 * 60 * 1000; // 15 minutes

    // If we're more than 15 minutes early or late vs scheduled start
    if (Math.abs(now - scheduledStart) > tolerance) {
      setTimingWarningOpen(true);
      return;
    }

    session.startSession(schedule);
    navigate("/cook");
  };

  const handleStartNow = () => {
    if (!config) return;
    // Regenerate schedule anchored to now + totalDuration as new serving time
    const nowSchedule = generateSchedule(config, new Date());
    session.startSession(nowSchedule);
    navigate("/cook");
  };

  const handleStartAnyway = () => {
    if (!schedule) return;
    session.startSession(schedule);
    navigate("/cook");
  };

  if (!config || !schedule || !meatCut) {
    const issues: { message: string; link: string; linkText: string }[] = [];
    if (!state.meatCutId) {
      issues.push({ message: "Please select a meat cut", link: "/configure", linkText: "Go to Configure" });
    }
    if (!state.actualWeightKg) {
      issues.push({ message: "Please enter the joint weight on the Cooking Day page", link: "/cooking-day", linkText: "Go to Cooking Day" });
    }
    if (!state.servingTime) {
      issues.push({ message: "Please set a serving time on the Cooking Day page", link: "/cooking-day", linkText: "Go to Cooking Day" });
    }
    if (issues.length === 0) {
      issues.push({ message: "Please complete the Cooking Day setup", link: "/cooking-day", linkText: "Go to Cooking Day" });
    }

    return (
      <main id="main-content" className="container mx-auto max-w-2xl px-4 py-8">
        <StepIndicator currentPath="/review" />
        <div className="mt-8 text-center space-y-3">
          {issues.map((issue, i) => (
            <div key={i}>
              <p className="text-muted-foreground">{issue.message}</p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => navigate(issue.link)}
              >
                {issue.linkText}
              </Button>
            </div>
          ))}
        </div>
      </main>
    );
  }

  const totalHours = Math.floor(schedule.totalDuration / 60);
  const totalMins = schedule.totalDuration % 60;

  return (
    <main id="main-content" className="container mx-auto max-w-2xl px-4 py-8">
      <StepIndicator currentPath="/review" />

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        Review Your Plan
      </h1>
      <p className="mt-1 text-muted-foreground">
        Check the timeline before you start cooking.
      </p>

      {/* ── Summary Card ── */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>At a Glance</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Meat</dt>
            <dd className="font-medium">
              {meatCut.name} ({state.actualWeightKg}kg)
            </dd>

            {state.doneness && (
              <>
                <dt className="text-muted-foreground">Doneness</dt>
                <dd className="font-medium capitalize">{state.doneness}</dd>
              </>
            )}

            <dt className="text-muted-foreground">Servings</dt>
            <dd className="font-medium">
              {state.servings} {state.servings === 1 ? "person" : "people"}
            </dd>

            <dt className="text-muted-foreground">Serving time</dt>
            <dd className="font-medium">{state.servingTime}</dd>

            <dt className="text-muted-foreground">Total cooking time</dt>
            <dd className="font-medium">
              {totalHours > 0 && `${totalHours} hour${totalHours !== 1 ? "s" : ""} `}
              {totalMins > 0 && `${totalMins} min${totalMins !== 1 ? "s" : ""}`}
              {totalHours === 0 && totalMins === 0 && "—"}
            </dd>

            <dt className="text-muted-foreground">Start time</dt>
            <dd className="font-medium flex items-center gap-1.5">
              <Clock className="size-3.5 text-muted-foreground" />
              You need to start at {formatTime(schedule.startTime)}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {/* ── Equipment Checklist ── */}
      {schedule.equipmentList.length > 0 && (
        <Card className="mt-4">
          <Collapsible open={equipmentOpen} onOpenChange={setEquipmentOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-muted/50 transition-colors rounded-t-xl">
              {equipmentOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              Equipment Checklist
              <Badge variant="secondary" className="ml-auto">
                {checkedEquipment.size}/{schedule.equipmentList.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <ul className="space-y-2">
                  {schedule.equipmentList.map((eq) => (
                    <li key={eq} className="flex items-center gap-3">
                      <Checkbox
                        checked={checkedEquipment.has(eq)}
                        onCheckedChange={() => toggleEquipment(eq)}
                      />
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          checkedEquipment.has(eq) &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {friendlyEquipmentName(eq)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {/* ── Warnings ── */}
      {schedule.warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {schedule.warnings.map((warning, i) => (
            <Alert key={i} variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>{warning}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* ── Timeline Preview ── */}
      <div className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Clock className="size-5" />
          Timeline
        </h2>

        <div className="relative mt-4 ml-4 border-l-2 border-border pl-6 space-y-6">
          {timelineGroups.map((group, gi) => (
            <div key={gi} className="relative">
              {/* Time marker */}
              <div className="absolute -left-[calc(2.25rem+1px)] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {gi + 1}
              </div>
              <div className="text-xs font-semibold text-muted-foreground mb-2">
                {formatTime(group.time)}
              </div>

              <div className="space-y-2">
                {group.steps.map((step) => {
                  const color = dishColorMap.get(step.dishId);
                  return (
                    <div
                      key={step.stepId}
                      className={cn(
                        "rounded-lg border p-3",
                        color?.border,
                        color?.bg,
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-base leading-none mt-0.5">
                          {resourceIcon(step.resource)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {step.summary}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {formatDuration(step.durationMinutes)}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span
                              className={cn(
                                "text-xs font-medium",
                                color?.text,
                              )}
                            >
                              {step.dishName}
                            </span>
                            {step.ovenTempCelsius !== null && (
                              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                <Flame className="size-3" />
                                {displayTemp(
                                  step.ovenTempCelsius,
                                  state.ovenTempDisplay,
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Serving time marker */}
          <div className="relative">
            <div className="absolute -left-[calc(2.25rem+1px)] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              🍽
            </div>
            <div className="text-sm font-semibold">
              {formatTime(schedule.servingTime)} — Serve!
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => navigate("/cooking-day")}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Cooking Day
        </Button>
        <Button variant="ghost" onClick={() => navigate("/configure")}>
          <Pencil className="size-4" data-icon="inline-start" />
          Edit Plan
        </Button>
        <ShareButton />
        <div className="flex-1" />
        <Button size="lg" onClick={handleStartCooking}>
          Start Cooking
          <ArrowRight className="size-4" aria-hidden="true" data-icon="inline-end" />
        </Button>
      </div>

      {/* ── Timing Warning Dialog ── */}
      <Dialog open={timingWarningOpen} onOpenChange={setTimingWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Outside cooking window
            </DialogTitle>
            <DialogDescription>
              {schedule && (
                <>
                  Your schedule is set to start at{" "}
                  <span className="font-medium text-foreground">{formatTime(schedule.startTime)}</span>
                  {" "}for a{" "}
                  <span className="font-medium text-foreground">{formatTime(schedule.servingTime)}</span>
                  {" "}serving time. Starting now would mean your timings won&rsquo;t line up.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleStartNow} className="w-full">
              Start now (adjust serving time)
            </Button>
            <Button variant="outline" onClick={handleStartAnyway} className="w-full">
              Start with original timing
            </Button>
            <Button
              variant="ghost"
              onClick={() => setTimingWarningOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
