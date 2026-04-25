import { Tabs } from "antd";

const RIGHT_TABS = [
  {
    key: "room-config",
    label: "Room Config",
    children: <div className="h-full" data-testid="agent-room-config-tab" />,
  },
  {
    key: "market",
    label: "Market",
    children: <div className="h-full" data-testid="agent-market-tab" />,
  },
];

export function RightPane() {
  return (
    <aside
      aria-label="Agent workspace details"
      className="h-full bg-white p-4 shadow-sm"
      data-testid="agent-right-pane"
      style={{ borderRadius: "var(--agent-radius-r10)" }}
    >
      <Tabs defaultActiveKey="room-config" items={RIGHT_TABS} />
    </aside>
  );
}
