import { Layout as AntLayout, Tooltip } from "antd";
import type { ComponentType, CSSProperties } from "react";
import { Link } from "react-router-dom";

import { colors } from "../../../../shared/design-tokens/colors";
import { motion } from "../../../../shared/design-tokens/motion";
import { radii } from "../../../../shared/design-tokens/radii";
import { shadows } from "../../../../shared/design-tokens/shadow";
import { spacing } from "../../../../shared/design-tokens/spacing";
import {
  fontFamilies,
  typeScale,
} from "../../../../shared/design-tokens/typography";

export interface NavigationItem {
  readonly name: string;
  readonly cn: string;
  readonly href: string;
  readonly icon: ComponentType<{
    readonly className?: string;
    readonly style?: CSSProperties;
  }>;
  readonly children?: readonly NavigationItem[];
}

interface SidebarProps {
  readonly collapsed: boolean;
  readonly navigation: readonly NavigationItem[];
  readonly pathname: string;
}

interface NavigationLinkProps {
  readonly collapsed: boolean;
  readonly item: NavigationItem;
  readonly level?: number;
  readonly pathname: string;
}

const sidebarWidth = 280;
const collapsedSidebarWidth = 88;

const siderStyle: CSSProperties = {
  background: colors.neutral[50],
  borderRight: `1px solid ${colors.neutral[200]}`,
  boxShadow: shadows.sm,
  overflowY: "auto",
  overflowX: "hidden",
};

const navStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacing[8],
  padding: spacing[16],
};

const navHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing[8],
  padding: `${spacing[8]}px ${spacing[12]}px ${spacing[4]}px`,
  color: colors.neutral[500],
  fontFamily: fontFamilies.sans,
  fontSize: typeScale.caption.fontSize,
  lineHeight: `${typeScale.caption.lineHeight}px`,
  fontWeight: 800,
};

const navHeaderAccentStyle: CSSProperties = {
  width: 20,
  height: 3,
  borderRadius: radii.full,
  background: colors.brand.primary,
};

const childGroupStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacing[4],
  marginTop: spacing[4],
  marginLeft: spacing[12],
  paddingLeft: spacing[12],
  borderLeft: `1px solid ${colors.neutral[200]}`,
};

const iconStyle: CSSProperties = {
  flexShrink: 0,
  fontSize: typeScale.h4.fontSize,
  lineHeight: 1,
};

const labelWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
};

const primaryLabelStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const secondaryLabelStyle: CSSProperties = {
  color: "inherit",
  fontSize: typeScale.caption.fontSize,
  lineHeight: `${typeScale.caption.lineHeight}px`,
  opacity: 0.72,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const isNavigationItemActive = (
  item: NavigationItem,
  pathname: string
): boolean => {
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
    return true;
  }

  return (
    item.children?.some(child => isNavigationItemActive(child, pathname)) ??
    false
  );
};

const getLinkStyle = (
  isActive: boolean,
  collapsed: boolean,
  level: number
): CSSProperties => ({
  minHeight: level === 0 ? 48 : 40,
  display: "flex",
  alignItems: "center",
  justifyContent: collapsed ? "center" : "flex-start",
  gap: collapsed ? 0 : spacing[12],
  padding: collapsed ? 0 : `${spacing[8]}px ${spacing[12]}px`,
  color: isActive ? colors.brand.active : colors.neutral[600],
  background: isActive ? colors.brand.surfaceTint : "transparent",
  border: `1px solid ${isActive && level === 0 ? colors.brand.primary : "transparent"}`,
  borderRadius: radii.md,
  fontFamily: fontFamilies.sans,
  fontSize:
    level === 0 ? typeScale["body-sm"].fontSize : typeScale.caption.fontSize,
  lineHeight:
    level === 0
      ? `${typeScale["body-sm"].lineHeight}px`
      : `${typeScale.caption.lineHeight}px`,
  fontWeight: isActive ? 800 : 700,
  textDecoration: "none",
  transitionDuration: motion.durationMs.fast,
  transitionProperty: "background, border-color, color, transform",
  transitionTimingFunction: motion.easing.standard,
});

const NavigationLink = ({
  collapsed,
  item,
  level = 0,
  pathname,
}: NavigationLinkProps) => {
  const Icon = item.icon;
  const isActive = isNavigationItemActive(item, pathname);
  const hasChildren = (item.children?.length ?? 0) > 0;
  const link = (
    <Link
      aria-current={isActive ? "page" : undefined}
      style={getLinkStyle(isActive, collapsed, level)}
      to={item.href}
    >
      <Icon style={iconStyle} />
      {!collapsed && (
        <span style={labelWrapStyle}>
          <span style={primaryLabelStyle}>{item.cn}</span>
          {item.cn !== item.name && (
            <span style={secondaryLabelStyle}>{item.name}</span>
          )}
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    if (level > 0) {
      return null;
    }

    return (
      <Tooltip key={item.href} placement="right" title={item.cn || item.name}>
        {link}
      </Tooltip>
    );
  }

  return (
    <div key={item.href}>
      {link}
      {hasChildren && (
        <div style={childGroupStyle}>
          {item.children?.map(child => (
            <NavigationLink
              collapsed={collapsed}
              item={child}
              key={child.href}
              level={level + 1}
              pathname={pathname}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ collapsed, navigation, pathname }: SidebarProps) => (
  <AntLayout.Sider
    collapsed={collapsed}
    collapsedWidth={collapsedSidebarWidth}
    style={siderStyle}
    theme="light"
    trigger={null}
    width={sidebarWidth}
  >
    <nav aria-label="主导航" style={navStyle}>
      {!collapsed && (
        <div style={navHeaderStyle}>
          <span style={navHeaderAccentStyle} />
          <span>导航</span>
        </div>
      )}
      {navigation.map(item => (
        <NavigationLink
          collapsed={collapsed}
          item={item}
          key={item.href}
          pathname={pathname}
        />
      ))}
    </nav>
  </AntLayout.Sider>
);

export default Sidebar;
