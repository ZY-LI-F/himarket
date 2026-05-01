import { antdTheme as claudeAntdTheme } from "../../shared/design-tokens/antdTheme";
import { colors as designTokenColors } from "../../shared/design-tokens/colors";

export { claudeAntdTheme };

export const colors = {
  colorPrimary: designTokenColors.brand.primary,
  colorPrimaryBg: designTokenColors.brand.surfaceTint,
  colorPrimaryHover: designTokenColors.brand.hover,
  colorPrimaryBgHover: designTokenColors.brand.surfaceTint,
  colorPrimarySecondary: designTokenColors.brand.surfaceTint,
  colorPrimaryHoverLight: designTokenColors.brand.surfaceTint,
  colorTextSecondaryCustom: designTokenColors.neutral[400],
  colorPrimaryBorderHover: designTokenColors.brand.hover,
  subTitle: designTokenColors.neutral[600],
  mainTitle: designTokenColors.neutral[800],
  "indigo-500": designTokenColors.brand.primary,
  "accent-dark": designTokenColors.neutral[800],
  "ring-light": designTokenColors.neutral[400],
} as const;

export const agentTokens = {
  aliyunBlue: designTokenColors.semantic.info,
  agentAccent: designTokenColors.brand.primary,
  radiusR6: "6px",
  radiusR10: "10px",
  radiusR14: "14px",
} as const;

export default claudeAntdTheme;
