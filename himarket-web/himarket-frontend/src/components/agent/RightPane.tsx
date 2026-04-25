import { Tabs } from "antd";
import { useParams } from "react-router-dom";
import { RoomConfigDrawer } from "./RoomConfigDrawer";

const DEFAULT_ROOM_ID = "room-main";

export function RightPane() {
  const { rid } = useParams();
  const roomId = rid || DEFAULT_ROOM_ID;
  const rightTabs = [
    {
      key: "room-config",
      label: "Room Config",
      children: (
        <div className="h-full" data-testid="agent-room-config-tab">
          <RoomConfigDrawer roomId={roomId} />
        </div>
      ),
    },
    {
      key: "market",
      label: "Market",
      children: <div className="h-full" data-testid="agent-market-tab" />,
    },
  ];

  return (
    <aside
      aria-label="Agent workspace details"
      className="h-full bg-white p-4 shadow-sm"
      data-testid="agent-right-pane"
      style={{ borderRadius: "var(--agent-radius-r10)" }}
    >
      <Tabs defaultActiveKey="room-config" items={rightTabs} />
    </aside>
  );
}
