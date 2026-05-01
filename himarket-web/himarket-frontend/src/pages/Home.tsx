import { Typography } from "antd";
import { Layout } from "../components/Layout";
import { useEffect } from "react";
import { getTokenFromCookie } from "../lib/utils";
import HomeModelCard from "../components/card/ModelCard";
import HomeMCPCard from "../components/card/HomeMcpCard";
import HomeAgentCard from "../components/card/AgentCard";
import HomeAPICard from "../components/card/APICard";
import HomeChatCard from "../components/card/ChatCard";
import TextType from "../components/TextType";

const { Title, Paragraph } = Typography;

function HomePage() {

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromCookie = params.get("fromCookie");
    const token = getTokenFromCookie();
    if (fromCookie && token) {
      localStorage.setItem("access_token", token);
    }
  }, []);

  return (
    <Layout>
      <div className="min-h-[calc(100vh-96px)] grid items-center py-8">
        <div className="flex min-h-[68vh] flex-col rounded-claude-xl border border-colorPrimary/20 bg-gradient-to-br from-colorPrimaryBgHover via-claude-neutral-50 to-white p-6 shadow-claude-lg sm:p-8">
          {/* 标题区域 */}
          <div className="mb-10 max-w-4xl">
            <div className="mb-4 inline-flex rounded-claude-full border border-colorPrimary/20 bg-white/70 px-4 py-1.5 text-sm font-medium text-colorPrimary shadow-claude-sm">
              Marketplace
            </div>
            <Title level={1} className="mb-6 text-5xl font-bold tracking-normal text-claude-neutral-900">
              <span className="bg-gradient-to-r from-colorPrimary via-claude-neutral-800 to-claude-neutral-900 bg-clip-text text-transparent">
                HiMarket 企业级AI开放平台
              </span>
            </Title>
            <Paragraph className="max-w-2xl text-xl text-subTitle">
              <TextType
                text={["开箱即用，快速集成"]}
                typingSpeed={120}
                showCursor={true}
                cursorCharacter="_"
              />
            </Paragraph>
          </div>

          {/* 特色功能卡片 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 flex-1">
            <div className="animate-[fadeInUp_0.6s_ease-out_0.1s_both]">
              <HomeModelCard />
            </div>
            <div className="animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
              <HomeMCPCard />
            </div>
            <div className="animate-[fadeInUp_0.6s_ease-out_0.3s_both]">
              <HomeAgentCard />
            </div>
            <div className="animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
              <HomeAPICard />
            </div>
            <div className="animate-[fadeInUp_0.6s_ease-out_0.5s_both]">
              <HomeChatCard />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default HomePage;
