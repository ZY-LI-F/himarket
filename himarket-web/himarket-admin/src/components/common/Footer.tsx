import { Layout as AntLayout } from "antd";
import type { CSSProperties } from "react";

import { colors } from "../../../../shared/design-tokens/colors";
import { spacing } from "../../../../shared/design-tokens/spacing";
import {
  fontFamilies,
  typeScale,
} from "../../../../shared/design-tokens/typography";

const footerStyle: CSSProperties = {
  minHeight: 64,
  padding: `${spacing[16]}px ${spacing[32]}px`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: spacing[16],
  color: colors.neutral[500],
  background: colors.neutral[50],
  borderTop: `1px solid ${colors.neutral[200]}`,
  fontFamily: fontFamilies.sans,
  fontSize: typeScale.caption.fontSize,
  lineHeight: `${typeScale.caption.lineHeight}px`,
};

const brandLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[8],
  fontWeight: 800,
  color: colors.neutral[700],
};

const brandDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: colors.brand.primary,
};

const Footer = () => (
  <AntLayout.Footer style={footerStyle}>
    <span style={brandLineStyle}>
      <span aria-hidden="true" style={brandDotStyle} />
      HiMarket Admin
    </span>
    <span>Operational Console</span>
  </AntLayout.Footer>
);

export default Footer;
