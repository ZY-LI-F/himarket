import { colors } from "./colors";
import { motion } from "./motion";
import { radii, radiiPx } from "./radii";
import { shadows } from "./shadow";
import { spacing, spacingPx } from "./spacing";
import { fontFamilies, typeScale } from "./typography";

export * from "./colors";
export * from "./typography";
export * from "./spacing";
export * from "./radii";
export * from "./shadow";
export * from "./motion";
export { antdTheme } from "./antdTheme";

export const designTokens = {
  colors,
  typography: {
    fontFamilies,
    typeScale,
  },
  spacing,
  spacingPx,
  radii,
  radiiPx,
  shadows,
  motion,
} as const;

export type DesignTokens = typeof designTokens;
