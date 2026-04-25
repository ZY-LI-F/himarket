import { Tabs } from "antd";

const CENTER_TABS = [
  {
    key: "chat",
    label: "Chat",
    children: <div className="h-full" data-testid="agent-chat-tab" />,
  },
  {
    key: "task-run",
    label: "Task Run",
    children: <div className="h-full" data-testid="agent-task-run-tab" />,
  },
];

export function CenterPane() {
  return (
    <main
      aria-label="Agent workspace center"
      className="h-full bg-white p-4 shadow-sm"
      data-testid="agent-center-pane"
      style={{ borderRadius: "var(--agent-radius-r14)" }}
    >
      <Tabs className="h-full" defaultActiveKey="chat" items={CENTER_TABS} />
    </main>
  );
}
