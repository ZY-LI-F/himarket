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
} as const;

export default claudeAntdTheme;
