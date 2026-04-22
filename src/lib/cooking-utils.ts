import type { Resource } from "@/types/recipe";
import type { ScheduledStep } from "@/lib/scheduler";

// ─── Dish Color Palette ─────────────────────────────────────────────

export interface DishColor {
  bg: string;
  text: string;
  dot: string;
  border: string;
}

const DISH_PALETTE: DishColor[] = [
  { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" },
  { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", dot: "bg-green-500", border: "border-green-200 dark:border-green-800" },
  { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500", border: "border-orange-200 dark:border-orange-800" },
  { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", border: "border-purple-200 dark:border-purple-800" },
  { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", dot: "bg-red-500", border: "border-red-200 dark:border-red-800" },
  { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" },
  { bg: "bg-teal-100 dark:bg-teal-950", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500", border: "border-teal-200 dark:border-teal-800" },
  { bg: "bg-pink-100 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", border: "border-pink-200 dark:border-pink-800" },
];

export function buildDishColorMap(steps: ScheduledStep[]): Map<string, DishColor> {
  const map = new Map<string, DishColor>();
  let index = 0;
  for (const step of steps) {
    if (!map.has(step.dishId)) {
      map.set(step.dishId, DISH_PALETTE[index % DISH_PALETTE.length]);
      index++;
    }
  }
  return map;
}

// ─── Formatting ─────────────────────────────────────────────────────

export function formatTime(date: Date): string {
  // Round to nearest 5 minutes for cleaner display
  const ms = date.getTime();
  const fiveMin = 5 * 60 * 1000;
  const rounded = new Date(Math.round(ms / fiveMin) * fiveMin);
  return rounded.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function resourceIcon(resource: Resource): string {
  switch (resource) {
    case "oven":
      return "🔥";
    case "hob":
      return "🍳";
    case "none":
      return "👋";
  }
}

export function friendlyEquipmentName(id: string): string {
  return id
    .split("-")
    .map((word, i) =>
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ");
}

// ─── Timeline Grouping ──────────────────────────────────────────────

export interface TimelineGroup {
  time: Date;
  steps: ScheduledStep[];
}

/** Group consecutive steps whose start times are within 5 minutes. */
export function groupStepsByTime(steps: ScheduledStep[]): TimelineGroup[] {
  if (steps.length === 0) return [];

  const groups: TimelineGroup[] = [];
  let current: TimelineGroup = { time: steps[0].startTime, steps: [steps[0]] };

  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const diffMs = step.startTime.getTime() - current.time.getTime();
    if (diffMs <= 5 * 60_000) {
      current.steps.push(step);
    } else {
      groups.push(current);
      current = { time: step.startTime, steps: [step] };
    }
  }
  groups.push(current);
  return groups;
}

// ─── Audio ──────────────────────────────────────────────────────────

export function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    // Clean up after sound finishes
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio API not available
  }
}

// ─── Notifications ──────────────────────────────────────────────────

export function requestNotificationPermission(): void {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function sendNotification(title: string, body: string): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/icon-192.png" });
  }
}

// ─── Misc ───────────────────────────────────────────────────────────

export function addMinutesToDate(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
