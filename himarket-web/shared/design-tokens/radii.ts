export const radii = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
  full: 9999,
} as const;

export const radiiPx = {
  none: "0px",
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "20px",
  full: "9999px",
} as const;

export type RadiusToken = keyof typeof radii;
