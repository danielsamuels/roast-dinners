import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  Flame,
  SkipForward,
  Timer,
  X,
} from "lucide-react";
import { useMealConfig } from "@/hooks/useMealConfig";
import { useCookingSession } from "@/hooks/useCookingSession";
import { StepIndicator } from "@/components/StepIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { generateSchedule, type ScheduledStep } from "@/lib/scheduler";
import { buildMealConfig } from "@/lib/config";
import { displayTemp } from "@/lib/temperature";
import {
  buildDishColorMap,
  formatTime,
  formatDuration,
  formatCountdown,
  resourceIcon,
  addMinutesToDate,
  playBeep,
  requestNotificationPermission,
  sendNotification,
  type DishColor,
} from "@/lib/cooking-utils";

// ─── Timer Banner Component ─────────────────────────────────────────

function TimerBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 bg-orange-500 px-4 py-3 text-white shadow-lg animate-in slide-in-from-top">
      <div className="flex items-center gap-2">
        <Timer className="size-5 shrink-0" aria-hidden="true" />
        <span className="font-medium text-sm">{message}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        className="text-white hover:bg-orange-600"
        aria-label="Dismiss timer alert"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}

// ─── Timeline Step Item ─────────────────────────────────────────────

function TimelineItem({
  step,
  isCompleted,
  isCurrent,
  color,
  lateOffset,
  onComplete,
  itemRef,
}: {
  step: ScheduledStep;
  isCompleted: boolean;
  isCurrent: boolean;
  color: DishColor | undefined;
  lateOffset: number;
  onComplete: (stepId: string) => void;
  itemRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const adjustedStart = addMinutesToDate(step.startTime, lateOffset);

  return (
    <div ref={itemRef} className="relative flex gap-3 pb-4">
      {/* Dot and line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "mt-1 size-3 shrink-0 rounded-full border-2 transition-all",
            isCompleted && "border-primary bg-primary",
            isCurrent &&
              "border-primary bg-primary animate-pulse ring-4 ring-primary/20",
            !isCompleted && !isCurrent && "border-muted-foreground/40 bg-background",
          )}
        />
        <div className="flex-1 w-px bg-border" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0 -mt-0.5 transition-opacity",
          isCompleted && "opacity-50",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(adjustedStart)}
          </span>
          <span
            className={cn(
              "size-2 rounded-full shrink-0",
              color?.dot ?? "bg-muted-foreground",
            )}
          />
        </div>
        <p
          className={cn(
            "text-sm mt-0.5",
            isCompleted && "line-through",
            isCurrent && "font-semibold",
          )}
        >
          {step.summary}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn("text-xs", color?.text)}>{step.dishName}</span>
          <span className="text-xs text-muted-foreground">
            · {formatDuration(step.durationMinutes)}
          </span>
        </div>

        {/* Inline done button for non-current steps */}
        {!isCompleted && !isCurrent && (
          <Button
            variant="ghost"
            size="xs"
            className="mt-1"
            onClick={() => onComplete(step.stepId)}
          >
            <Check className="size-3" data-icon="inline-start" />
            Done
          </Button>
        )}
        {isCompleted && (
          <span className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
            <Check className="size-3" /> Completed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Current Step Card ──────────────────────────────────────────────

function CurrentStepCard({
  step,
  color,
  timerSeconds,
  ovenTempDisplay,
  lateOffset,
  onComplete,
}: {
  step: ScheduledStep;
  color: DishColor | undefined;
  timerSeconds: number | null;
  ovenTempDisplay: string;
  lateOffset: number;
  onComplete: () => void;
}) {
  const adjustedStart = addMinutesToDate(step.startTime, lateOffset);
  const adjustedEnd = addMinutesToDate(step.endTime, lateOffset);
  const totalSec = step.durationMinutes * 60;
  const progress =
    timerSeconds !== null && totalSec > 0
      ? Math.max(0, ((totalSec - timerSeconds) / totalSec) * 100)
      : 0;
  const timerExpired = timerSeconds !== null && timerSeconds <= 0;

  return (
    <Card
      className={cn(
        "border-2 transition-colors",
        color?.border,
        timerExpired && "border-orange-400 dark:border-orange-600",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={cn(color?.bg, color?.text, "border", color?.border)}>
            {step.dishName}
          </Badge>
          <span className="text-lg leading-none">
            {resourceIcon(step.resource)}
          </span>
          {step.ovenTempCelsius !== null && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="size-3" />
              {displayTemp(
                step.ovenTempCelsius,
                ovenTempDisplay as "celsius-fan" | "celsius-conventional" | "gas-mark",
              )}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl mt-2">{step.summary}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {step.instruction}
        </p>

        {/* Time range */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {formatTime(adjustedStart)} – {formatTime(adjustedEnd)}
          <span className="text-muted-foreground/60">·</span>
          {formatDuration(step.durationMinutes)}
        </div>

        {/* Timer */}
        {timerSeconds !== null && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Timer className="size-4" aria-hidden="true" />
                {timerExpired ? "Timer complete!" : "Time remaining"}
              </span>
              <span
                aria-live="polite"
                aria-atomic="true"
                className={cn(
                  "text-2xl font-bold tabular-nums",
                  timerExpired && "text-orange-500",
                )}
              >
                {formatCountdown(Math.max(0, timerSeconds))}
              </span>
            </div>
            <Progress value={progress} aria-label={`Step progress: ${Math.round(progress)}%`} />
          </div>
        )}

        <Button size="lg" className="w-full" onClick={onComplete}>
          <Check className="size-4" data-icon="inline-start" />
          Mark Step Done
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────

export default function CookPage() {
  const navigate = useNavigate();
  const { state } = useMealConfig();
  const session = useCookingSession();

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerBanner, setTimerBanner] = useState<string | null>(null);

  // Mobile timeline toggle
  const [timelineOpen, setTimelineOpen] = useState(false);

  // Dialogs
  const [skipDishOpen, setSkipDishOpen] = useState(false);
  const [skipConfirmDish, setSkipConfirmDish] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [lateOpen, setLateOpen] = useState(false);
  const [customLateMinutes, setCustomLateMinutes] = useState("");

  // Refs
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const currentStepRef = useRef<HTMLDivElement | null>(null);

  const config = useMemo(() => buildMealConfig(state), [state]);

  // Initialize session if needed
  useEffect(() => {
    if (session.isActive && session.schedule) return;
    if (!config) return;
    const schedule = generateSchedule(config, new Date());
    session.startSession(schedule);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request wake lock and notification permission on mount
  useEffect(() => {
    requestNotificationPermission();

    async function acquireWakeLock() {
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        } catch {
          // Wake lock not supported or denied
        }
      }
    }
    acquireWakeLock();

    // Re-acquire on visibility change (released when tab hidden)
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        acquireWakeLock();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      try { wakeLockRef.current?.release(); } catch { /* already released */ }
      wakeLockRef.current = null;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Compute effective steps (filtered by skipped dishes, offset-adjusted for display)
  const effectiveSteps = useMemo(() => {
    if (!session.schedule) return [];
    return session.schedule.steps.filter(
      (s) => !session.skippedDishIds.includes(s.dishId),
    );
  }, [session.schedule, session.skippedDishIds]);

  const dishColorMap = useMemo(
    () => (session.schedule ? buildDishColorMap(session.schedule.steps) : new Map()),
    [session.schedule],
  );

  // Current step = first non-completed step in order
  const currentStep = useMemo(() => {
    return effectiveSteps.find(
      (s) => !session.completedStepIds.includes(s.stepId),
    );
  }, [effectiveSteps, session.completedStepIds]);

  const completedCount = useMemo(
    () =>
      effectiveSteps.filter((s) =>
        session.completedStepIds.includes(s.stepId),
      ).length,
    [effectiveSteps, session.completedStepIds],
  );

  // Unique active dishes for skip dialog
  const activeDishes = useMemo(() => {
    const seen = new Map<string, string>();
    for (const step of effectiveSteps) {
      if (
        !session.completedStepIds.includes(step.stepId) &&
        !seen.has(step.dishId)
      ) {
        seen.set(step.dishId, step.dishName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [effectiveSteps, session.completedStepIds]);

  // ── Timer Logic ──
  // Single effect: subscribes to the clock for current step's countdown.
  // All setState calls are inside async callbacks (setTimeout/setInterval), never synchronous.
  const currentStepId = currentStep?.stepId ?? null;
  const currentStepDuration = currentStep?.durationMinutes ?? 0;
  const currentStepSummary = currentStep?.summary ?? "";

  useEffect(() => {
    if (!currentStepId || currentStepDuration <= 0) return;

    const totalSeconds = currentStepDuration * 60;
    const startedAt = Date.now();
    let beepDone = false;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setTimerSeconds(remaining);

      if (remaining === 0 && !beepDone) {
        beepDone = true;
        playBeep();
        sendNotification("⏰ Timer Done!", `${currentStepSummary} is ready`);
        setTimerBanner(`${currentStepSummary} — timer complete!`);
      }
    };

    // Immediate async tick to set initial value, then regular interval
    const firstTick = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(firstTick);
      clearInterval(interval);
    };
  }, [currentStepId, currentStepDuration, currentStepSummary]);

  // Auto-scroll timeline to current step
  useEffect(() => {
    currentStepRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentStepId]);

  // Detect completion — all effective steps done
  useEffect(() => {
    if (effectiveSteps.length === 0) return;
    const allDone = effectiveSteps.every((s) =>
      session.completedStepIds.includes(s.stepId),
    );
    if (allDone) {
      // Small delay so user sees the last step completion
      const timeout = setTimeout(() => navigate("/done"), 800);
      return () => clearTimeout(timeout);
    }
  }, [effectiveSteps, session.completedStepIds, navigate]);

  // ── Handlers ──

  const handleCompleteStep = useCallback(
    (stepId: string) => {
      session.completeStep(stepId);
    },
    [session],
  );

  const handleSkipDish = useCallback(
    (dishId: string) => {
      session.skipDish(dishId);
      setSkipDishOpen(false);
      setSkipConfirmDish(null);
    },
    [session],
  );

  const handleLateAdjust = useCallback(
    (minutes: number) => {
      if (minutes > 0) {
        session.adjustLateOffset(minutes);
      }
      setLateOpen(false);
      setCustomLateMinutes("");
    },
    [session],
  );

  // ── Not ready state ──
  if (!session.schedule || !session.isActive) {
    if (!config) {
      return (
        <main id="main-content" className="container mx-auto max-w-2xl px-4 py-8 text-center">
          <StepIndicator currentPath="/cook" />
          <p className="mt-8 text-muted-foreground">
            Please configure your meal first.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/configure")}
          >
            Go to Configuration
          </Button>
        </main>
      );
    }

    return (
      <main id="main-content" className="container mx-auto max-w-2xl px-4 py-8 text-center">
        <StepIndicator currentPath="/cook" />
        <p className="mt-8 text-muted-foreground">Starting cooking session…</p>
      </main>
    );
  }

  const overallProgress =
    effectiveSteps.length > 0
      ? (completedCount / effectiveSteps.length) * 100
      : 0;

  // ── Timeline Component (shared between desktop and mobile) ──
  const timeline = (
    <div className="space-y-0">
      {effectiveSteps.map((step) => {
        const isCompleted = session.completedStepIds.includes(step.stepId);
        const isCurrent = currentStep?.stepId === step.stepId;
        return (
          <TimelineItem
            key={step.stepId}
            step={step}
            isCompleted={isCompleted}
            isCurrent={isCurrent}
            color={dishColorMap.get(step.dishId)}
            lateOffset={session.lateOffsetMinutes}
            onComplete={handleCompleteStep}
            itemRef={isCurrent ? currentStepRef : undefined}
          />
        );
      })}
    </div>
  );

  return (
    <main id="main-content" className="container mx-auto max-w-5xl px-4 py-4">
      {/* Timer banner */}
      {timerBanner && (
        <TimerBanner
          message={timerBanner}
          onDismiss={() => setTimerBanner(null)}
        />
      )}

      <StepIndicator currentPath="/cook" />

      <h1 className="sr-only">Cooking Session</h1>

      {/* Overall progress */}
      <div className="mt-4 flex items-center gap-3">
        <Progress value={overallProgress} className="flex-1" aria-label={`Overall progress: ${completedCount} of ${effectiveSteps.length} steps complete`} />
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {completedCount}/{effectiveSteps.length} steps
        </span>
      </div>

      {/* Action bar */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setLateOpen(true)}>
          <Clock className="size-3.5" data-icon="inline-start" />
          Running Late
          {session.lateOffsetMinutes > 0 && (
            <Badge variant="secondary" className="ml-1">
              +{session.lateOffsetMinutes}m
            </Badge>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSkipDishOpen(true)}
        >
          <SkipForward className="size-3.5" data-icon="inline-start" />
          Skip a Dish
        </Button>
      </div>

      {/* ── Desktop: Two columns ── */}
      <div className="mt-4 hidden md:grid md:grid-cols-[280px_1fr] md:gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: Timeline */}
        <div className="max-h-[calc(100svh-12rem)] overflow-y-auto pr-2 scrollbar-thin">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
            Timeline
          </h2>
          {timeline}
        </div>

        {/* Right: Current step */}
        <div>
          {currentStep ? (
            <CurrentStepCard
              step={currentStep}
              color={dishColorMap.get(currentStep.dishId)}
              timerSeconds={timerSeconds}
              ovenTempDisplay={state.ovenTempDisplay}
              lateOffset={session.lateOffsetMinutes}
              onComplete={() => handleCompleteStep(currentStep.stepId)}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-lg font-semibold">All steps complete! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your roast dinner is ready.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Mobile: Single column ── */}
      <div className="mt-4 md:hidden space-y-4">
        {/* Current step */}
        {currentStep ? (
          <CurrentStepCard
            step={currentStep}
            color={dishColorMap.get(currentStep.dishId)}
            timerSeconds={timerSeconds}
            ovenTempDisplay={state.ovenTempDisplay}
            lateOffset={session.lateOffsetMinutes}
            onComplete={() => handleCompleteStep(currentStep.stepId)}
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg font-semibold">All steps complete! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your roast dinner is ready.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Collapsible timeline */}
        <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold hover:bg-muted/50 transition-colors">
            {timelineOpen ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
            Timeline
            <Badge variant="secondary" className="ml-auto">
              {completedCount}/{effectiveSteps.length}
            </Badge>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-3 pl-1">{timeline}</div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* ── Skip Dish Dialog ── */}
      <Dialog open={skipDishOpen} onOpenChange={setSkipDishOpen}>
        <DialogContent>
          {skipConfirmDish ? (
            <>
              <DialogHeader>
                <DialogTitle>Skip {skipConfirmDish.name}?</DialogTitle>
                <DialogDescription>
                  This will remove all remaining steps for{" "}
                  {skipConfirmDish.name}. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSkipConfirmDish(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleSkipDish(skipConfirmDish.id)}
                >
                  <SkipForward className="size-4" data-icon="inline-start" />
                  Skip {skipConfirmDish.name}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Skip a Dish</DialogTitle>
                <DialogDescription>
                  Select a dish to remove all its remaining steps.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {activeDishes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No dishes to skip.
                  </p>
                ) : (
                  activeDishes.map((dish) => {
                    const color = dishColorMap.get(dish.id);
                    return (
                      <Button
                        key={dish.id}
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() =>
                          setSkipConfirmDish({ id: dish.id, name: dish.name })
                        }
                      >
                        <span
                          className={cn(
                            "size-3 rounded-full shrink-0",
                            color?.dot ?? "bg-muted-foreground",
                          )}
                        />
                        {dish.name}
                      </Button>
                    );
                  })
                )}
              </div>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline" />}
                >
                  Cancel
                </DialogClose>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Running Late Dialog ── */}
      <Dialog open={lateOpen} onOpenChange={setLateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Running Late?</DialogTitle>
            <DialogDescription>
              Shift all remaining step times forward. Current offset:{" "}
              <strong>+{session.lateOffsetMinutes} min</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <Button
                key={mins}
                variant="outline"
                onClick={() => handleLateAdjust(mins)}
              >
                +{mins}m
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={120}
              placeholder="Custom minutes"
              value={customLateMinutes}
              onChange={(e) => setCustomLateMinutes(e.target.value)}
              aria-label="Custom late offset in minutes"
            />
            <Button
              onClick={() =>
                handleLateAdjust(parseInt(customLateMinutes, 10) || 0)
              }
              disabled={
                !customLateMinutes || parseInt(customLateMinutes, 10) <= 0
              }
            >
              Apply
            </Button>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
