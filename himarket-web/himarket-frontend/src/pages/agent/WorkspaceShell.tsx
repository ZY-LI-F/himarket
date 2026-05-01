import { useState } from "react";
import { Layout } from "antd";
import { CenterPane } from "../../components/agent/CenterPane";
import { LeftPane } from "../../components/agent/LeftPane";
import { RightPane } from "../../components/agent/RightPane";
import { TopBar } from "../../components/agent/TopBar";
import "../../styles/agent-tokens.css";

const { Header, Sider, Content } = Layout;
const LEFT_PANE_WIDTH = 280;
const RIGHT_PANE_WIDTH = 360;
const RIGHT_COLLAPSED_WIDTH = 64;

export default function WorkspaceShell() {
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <Layout
      className="agent-workspace-shell h-screen overflow-hidden bg-claude-neutral-50"
      data-testid="agent-workspace-shell"
      style={{ borderTop: "4px solid var(--aliyun-blue)" }}
    >
      <Header className="h-14 border-b border-claude-neutral-200 bg-white/90 p-0 leading-none shadow-claude-sm backdrop-blur-md">
        <TopBar />
      </Header>
      <Layout className="min-h-0 flex-1 gap-4 bg-claude-neutral-50 p-4">
        <Sider
          className="overflow-hidden rounded-r10 border border-claude-neutral-200 shadow-claude-sm"
          theme="light"
          width={LEFT_PANE_WIDTH}
          style={{ background: "transparent" }}
        >
          <LeftPane />
        </Sider>
        <Content className="min-w-0">
          <CenterPane />
        </Content>
        <Sider
          className="overflow-hidden rounded-r10 border border-claude-neutral-200 shadow-claude-sm"
          collapsed={rightCollapsed}
          collapsedWidth={RIGHT_COLLAPSED_WIDTH}
          collapsible
          onCollapse={setRightCollapsed}
          reverseArrow
          theme="light"
          width={RIGHT_PANE_WIDTH}
          style={{ background: "transparent" }}
        >
          <RightPane />
        </Sider>
      </Layout>
    </Layout>
  );
}
