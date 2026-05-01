import { colors } from "../../../shared/design-tokens/colors";
import { fontFamilies, typeScale } from "../../../shared/design-tokens/typography";

export const adminEchartsTheme = {
  color: [
    colors.brand.primary,
    colors.semantic.info,
    colors.semantic.success,
    colors.semantic.warning,
    colors.semantic.error,
    colors.brand.hover,
    colors.neutral[600],
  ],
  backgroundColor: "transparent",
  textStyle: {
    color: colors.neutral[700],
    fontFamily: fontFamilies.sans,
    fontSize: typeScale["body-sm"].fontSize,
  },
  title: {
    textStyle: {
      color: colors.neutral[800],
      fontFamily: fontFamilies.sans,
      fontSize: typeScale.h4.fontSize,
      fontWeight: 600,
    },
  },
  legend: {
    textStyle: {
      color: colors.neutral[600],
      fontFamily: fontFamilies.sans,
      fontSize: typeScale.caption.fontSize,
    },
    itemGap: 16,
  },
  tooltip: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
    textStyle: {
      color: colors.neutral[800],
      fontFamily: fontFamilies.sans,
      fontSize: typeScale["body-sm"].fontSize,
    },
    extraCssText: "border-radius: 8px;",
  },
  categoryAxis: {
    axisLine: {
      lineStyle: {
        color: colors.neutral[300],
      },
    },
    axisTick: {
      lineStyle: {
        color: colors.neutral[300],
      },
    },
    axisLabel: {
      color: colors.neutral[500],
      fontFamily: fontFamilies.sans,
      fontSize: typeScale.caption.fontSize,
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: colors.neutral[200],
      },
    },
  },
  valueAxis: {
    axisLine: {
      lineStyle: {
        color: colors.neutral[300],
      },
    },
    axisTick: {
      lineStyle: {
        color: colors.neutral[300],
      },
    },
    axisLabel: {
      color: colors.neutral[500],
      fontFamily: fontFamilies.sans,
      fontSize: typeScale.caption.fontSize,
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: colors.neutral[200],
        type: "dashed",
      },
    },
  },
  line: {
    lineStyle: {
      width: 2,
    },
    areaStyle: {
      opacity: 0.08,
    },
    symbolSize: 6,
  },
} as const;
