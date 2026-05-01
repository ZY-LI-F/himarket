export const brandColors = {
  primary: "#D97757",
  hover: "#C9633F",
  active: "#B85428",
  surfaceTint: "#FBF0EA",
} as const;

export const neutralColors = {
  50: "#FAFAF7",
  100: "#F4F3EE",
  200: "#E8E6DD",
  300: "#D6D3C7",
  400: "#B8B4A6",
  500: "#8B8678",
  600: "#5C5749",
  700: "#3D3A30",
  800: "#262420",
  900: "#141312",
} as const;

export const semanticColors = {
  success: "#3F9F60",
  warning: "#D89C3F",
  error: "#C7503D",
  info: "#3F7BC9",
} as const;

export const colors = {
  brand: brandColors,
  neutral: neutralColors,
  semantic: semanticColors,
} as const;

export type BrandColorToken = keyof typeof brandColors;
export type NeutralColorToken = keyof typeof neutralColors;
export type SemanticColorToken = keyof typeof semanticColors;
