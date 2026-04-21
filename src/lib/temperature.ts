import type { OvenTempDisplay } from "@/types/recipe";

// Gas mark table maps conventional Celsius → gas mark label
const GAS_MARKS: [number, string][] = [
  [110, "¼"],
  [120, "½"],
  [140, "1"],
  [150, "2"],
  [160, "3"],
  [180, "4"],
  [190, "5"],
  [200, "6"],
  [220, "7"],
  [230, "8"],
  [240, "9"],
];

function nearestGasMark(conventionalCelsius: number): string {
  let closest = GAS_MARKS[0];
  let minDiff = Math.abs(conventionalCelsius - closest[0]);
  for (const entry of GAS_MARKS) {
    const diff = Math.abs(conventionalCelsius - entry[0]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }
  return closest[1];
}

/**
 * Convert a fan-oven Celsius temperature to the user's preferred display format.
 *
 * Recipe data stores temperatures as fan-oven Celsius.
 * - celsius-fan: show as-is with "(Fan)" suffix
 * - celsius-conventional: add ~20°C (standard fan→conventional offset)
 * - gas-mark: convert to conventional first, then find nearest gas mark
 */
export function displayTemp(
  celsiusFan: number,
  display: OvenTempDisplay,
): string {
  switch (display) {
    case "celsius-fan":
      return `${celsiusFan}°C (Fan)`;
    case "celsius-conventional":
      return `${celsiusFan + 20}°C`;
    case "gas-mark":
      return `Gas Mark ${nearestGasMark(celsiusFan + 20)}`;
  }
}
