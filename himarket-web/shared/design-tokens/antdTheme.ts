import type { ThemeConfig } from "antd";

import { colors } from "./colors";
import { motion } from "./motion";
import { radii } from "./radii";
import { shadows } from "./shadow";
import { spacing } from "./spacing";
import { fontFamilies, typeScale, type TypeScaleStep } from "./typography";

const lineHeightRatio = (step: TypeScaleStep): number => step.lineHeight / step.fontSize;

export const antdTheme = {
  token: {
    colorPrimary: colors.brand.primary,
    colorPrimaryHover: colors.brand.hover,
    colorPrimaryActive: colors.brand.active,
    colorPrimaryBg: colors.brand.surfaceTint,
    colorPrimaryBgHover: colors.brand.surfaceTint,
    colorPrimaryBorder: colors.brand.primary,
    colorPrimaryBorderHover: colors.brand.hover,
    colorPrimaryText: colors.brand.primary,
    colorPrimaryTextHover: colors.brand.hover,
    colorPrimaryTextActive: colors.brand.active,
    colorSuccess: colors.semantic.success,
    colorWarning: colors.semantic.warning,
    colorError: colors.semantic.error,
    colorInfo: colors.semantic.info,
    colorBgBase: colors.neutral[50],
    colorBgLayout: colors.neutral[100],
    colorFillQuaternary: colors.neutral[100],
    colorFillTertiary: colors.neutral[200],
    colorFillSecondary: colors.neutral[300],
    colorBorderSecondary: colors.neutral[200],
    colorBorder: colors.neutral[300],
    colorText: colors.neutral[900],
    colorTextSecondary: colors.neutral[700],
    colorTextTertiary: colors.neutral[500],
    colorTextQuaternary: colors.neutral[400],
    fontFamily: fontFamilies.sans,
    fontFamilyCode: fontFamilies.mono,
    fontSize: typeScale.body.fontSize,
    fontSizeLG: typeScale["body-lg"].fontSize,
    fontSizeSM: typeScale["body-sm"].fontSize,
    fontSizeHeading1: typeScale.h1.fontSize,
    fontSizeHeading2: typeScale.h2.fontSize,
    fontSizeHeading3: typeScale.h3.fontSize,
    fontSizeHeading4: typeScale.h4.fontSize,
    lineHeight: lineHeightRatio(typeScale.body),
    lineHeightLG: lineHeightRatio(typeScale["body-lg"]),
    lineHeightSM: lineHeightRatio(typeScale["body-sm"]),
    lineHeightHeading1: lineHeightRatio(typeScale.h1),
    lineHeightHeading2: lineHeightRatio(typeScale.h2),
    lineHeightHeading3: lineHeightRatio(typeScale.h3),
    lineHeightHeading4: lineHeightRatio(typeScale.h4),
    marginXXS: spacing[4],
    marginXS: spacing[8],
    marginSM: spacing[12],
    margin: spacing[16],
    marginMD: spacing[20],
    marginLG: spacing[24],
    marginXL: spacing[32],
    paddingXXS: spacing[4],
    paddingXS: spacing[8],
    paddingSM: spacing[12],
    padding: spacing[16],
    paddingMD: spacing[20],
    paddingLG: spacing[24],
    paddingXL: spacing[32],
    borderRadius: radii.md,
    borderRadiusSM: radii.sm,
    borderRadiusLG: radii.lg,
    borderRadiusXS: radii.sm,
    boxShadow: shadows.md,
    boxShadowSecondary: shadows.lg,
    boxShadowTertiary: shadows.sm,
    controlOutline: shadows.focus,
    motionDurationFast: motion.durationMs.fast,
    motionDurationMid: motion.durationMs.base,
    motionDurationSlow: motion.durationMs.slow,
    motionEaseInOut: motion.easing.standard,
  },
} satisfies ThemeConfig;

export default antdTheme;
