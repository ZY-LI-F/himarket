import {
  LoginOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Layout as AntLayout, Tooltip } from "antd";
import type { CSSProperties } from "react";

import { colors } from "../../../../shared/design-tokens/colors";
import { motion } from "../../../../shared/design-tokens/motion";
import { radii } from "../../../../shared/design-tokens/radii";
import { shadows } from "../../../../shared/design-tokens/shadow";
import { spacing } from "../../../../shared/design-tokens/spacing";
import {
  fontFamilies,
  typeScale,
} from "../../../../shared/design-tokens/typography";

interface HeaderProps {
  readonly isLoggedIn: boolean;
  readonly sidebarCollapsed: boolean;
  readonly onLogin: () => void;
  readonly onLogout: () => void;
  readonly onToggleSidebar: () => void;
}

const headerStyle: CSSProperties = {
  height: 72,
  paddingInline: spacing[24],
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: colors.neutral[50],
  borderBottom: `1px solid ${colors.neutral[200]}`,
  boxShadow: shadows.sm,
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const brandClusterStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[16],
  minWidth: 0,
};

const toggleButtonStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: radii.md,
  color: colors.neutral[800],
  border: `1px solid ${colors.neutral[200]}`,
  background: colors.neutral[50],
};

const brandMarkStyle: CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: radii.md,
  display: "grid",
  placeItems: "center",
  color: colors.neutral[50],
  background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.active} 100%)`,
  boxShadow: shadows.md,
  fontFamily: fontFamilies.sans,
  fontSize: typeScale["body-sm"].fontSize,
  fontWeight: 800,
};

const brandTextStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const productNameStyle: CSSProperties = {
  color: colors.neutral[900],
  fontFamily: fontFamilies.sans,
  fontSize: typeScale.h4.fontSize,
  lineHeight: `${typeScale.h4.lineHeight}px`,
  fontWeight: 800,
};

const productMetaStyle: CSSProperties = {
  color: colors.brand.active,
  fontFamily: fontFamilies.sans,
  fontSize: typeScale.caption.fontSize,
  lineHeight: `${typeScale.caption.lineHeight}px`,
  fontWeight: 700,
};

const userAreaStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[12],
};

const userPillStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[8],
  minHeight: 40,
  padding: `0 ${spacing[12]}px`,
  color: colors.neutral[800],
  background: colors.brand.surfaceTint,
  border: `1px solid ${colors.neutral[200]}`,
  borderRadius: radii.full,
  fontWeight: 700,
};

const actionButtonStyle: CSSProperties = {
  borderRadius: radii.md,
  transitionDuration: motion.durationMs.fast,
};

const Header = ({
  isLoggedIn,
  sidebarCollapsed,
  onLogin,
  onLogout,
  onToggleSidebar,
}: HeaderProps) => {
  const ToggleIcon = sidebarCollapsed ? MenuUnfoldOutlined : MenuFoldOutlined;

  return (
    <AntLayout.Header style={headerStyle}>
      <div style={brandClusterStyle}>
        <Tooltip title={sidebarCollapsed ? "展开导航" : "折叠导航"}>
          <Button
            aria-label={sidebarCollapsed ? "展开导航" : "折叠导航"}
            icon={<ToggleIcon />}
            onClick={onToggleSidebar}
            style={toggleButtonStyle}
            type="text"
          />
        </Tooltip>
        <div aria-hidden="true" style={brandMarkStyle}>
          Hi
        </div>
        <div style={brandTextStyle}>
          <span style={productNameStyle}>HiMarket</span>
          <span style={productMetaStyle}>Admin Console</span>
        </div>
      </div>

      {isLoggedIn ? (
        <div style={userAreaStyle}>
          <div style={userPillStyle}>
            <UserOutlined />
            <span>admin</span>
          </div>
          <Button
            icon={<LogoutOutlined />}
            onClick={onLogout}
            style={actionButtonStyle}
          >
            退出
          </Button>
        </div>
      ) : (
        <Button
          icon={<LoginOutlined />}
          onClick={onLogin}
          style={actionButtonStyle}
          type="primary"
        >
          登录
        </Button>
      )}
    </AntLayout.Header>
  );
};

export default Header;
