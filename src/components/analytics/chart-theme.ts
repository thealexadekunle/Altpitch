import type { CSSProperties } from "react";

/** Validated dark-mode categorical slots (dataviz skill reference palette) — chart color is a separate
 *  concern from the product accent, which stays reserved for verdicts/scores/CTAs. */
export const SERIES = {
  blue: "#3987e5",
  orange: "#d95926",
  aqua: "#199e70",
  yellow: "#c98500",
} as const;

export const CHART_GRID = "hsl(220 26% 20%)";
export const CHART_AXIS = "hsl(215 18% 65%)";
export const CHART_TOOLTIP_BG = "hsl(220 40% 11%)";
export const CHART_TOOLTIP_BORDER = "hsl(220 26% 20%)";

export const tooltipContentStyle: CSSProperties = {
  background: CHART_TOOLTIP_BG,
  border: `1px solid ${CHART_TOOLTIP_BORDER}`,
  borderRadius: 8,
  fontSize: 12,
};
