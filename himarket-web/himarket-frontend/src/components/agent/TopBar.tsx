import { Badge, Button, Dropdown, Tabs } from "antd";
import type { MenuProps } from "antd";
import { ChevronDown } from "lucide-react";
import { UserInfo } from "../UserInfo";

const WORKSPACE_ITEMS: MenuProps["items"] = [
  {
    key: "default",
    label: "Default Workspace",
  },
];

const ROOM_TABS = [
  {
    key: "main",
    label: "Main Room",
    children: null,
  },
  {
    key: "review",
    label: "Review Room",
    children: null,
  },
];

export function TopBar() {
  return (
    <div className="flex h-14 items-center gap-4 bg-white px-4">
      <div
        aria-hidden="true"
        className="h-6 w-1 flex-none"
        data-testid="agent-accent-marker"
        style={{
          background: "var(--agent-accent)",
          borderRadius: "var(--agent-radius-r6)",
        }}
      />
      <Dropdown menu={{ items: WORKSPACE_ITEMS }} trigger={["click"]}>
        <Button className="flex items-center gap-2" type="text">
          <span className="text-sm font-medium">Default Workspace</span>
          <ChevronDown aria-hidden="true" size={16} />
        </Button>
      </Dropdown>
      <Tabs
        className="min-w-80"
        defaultActiveKey="main"
        items={ROOM_TABS}
        size="small"
        tabBarStyle={{ margin: 0 }}
      />
      <div className="flex-1" />
      <Badge
        color="var(--agent-accent)"
        text={<span className="text-xs text-gray-600">Idle</span>}
      />
      <UserInfo />
    </div>
  );
}
