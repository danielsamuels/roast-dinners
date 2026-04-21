import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/", label: "Setup" },
  { path: "/configure", label: "Configure" },
  { path: "/shopping", label: "Shopping" },
  { path: "/review", label: "Review" },
  { path: "/cook", label: "Cook" },
] as const;

interface StepIndicatorProps {
  currentPath: string;
}

export function StepIndicator({ currentPath }: StepIndicatorProps) {
  const currentIndex = STEPS.findIndex((s) => s.path === currentPath);

  return (
    <nav aria-label="Progress" className="flex items-center justify-center gap-1 py-4 sm:gap-2">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={step.path} className="flex items-center gap-1 sm:gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isComplete && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? <Check className="size-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[11px] sm:block",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mb-4 h-px w-4 sm:mb-5 sm:w-8",
                  i < currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
