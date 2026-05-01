import { Button } from "antd";
import { MessageSquare, Code2, Sparkles, Zap, Bot, Globe } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface WelcomeViewProps {
  type: "chat" | "coding";
}

const chatFeatures = [
  {
    icon: <Bot size={20} />,
    title: "AI 多模型对话",
    desc: "支持多种主流 AI 大模型，一站式智能问答体验",
  },
  {
    icon: <Sparkles size={20} />,
    title: "多模型对比",
    desc: "同时发送多模型对比回答，选择最优结果",
  },
  {
    icon: <Globe size={20} />,
    title: "MCP 工具集成",
    desc: "集成 MCP 服务能力，AI 可调用外部工具增强回答",
  },
];

const codingFeatures = [
  {
    icon: <Code2 size={20} />,
    title: "AI 辅助编程",
    desc: "通过自然语言描述需求，AI 自动生成代码方案",
  },
  {
    icon: <Zap size={20} />,
    title: "沙箱执行",
    desc: "代码在安全沙箱中实时运行，即时查看执行结果",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "交互式对话",
    desc: "与 AI 持续对话迭代代码，逐步完善项目",
  },
];

export function WelcomeView({ type }: WelcomeViewProps) {
  const { login } = useAuth();
  const navigate = useNavigate();

  const isChatType = type === "chat";
  const title = isChatType ? "HiChat" : "HiCoding";
  const subtitle = isChatType
    ? "与 AI 模型智能对话，探索无限可能"
    : "AI 驱动的智能编程助手，让代码触手可及";
  const features = isChatType ? chatFeatures : codingFeatures;
  const ctaText = isChatType ? "登录后开始对话" : "登录后开始编码";

  return (
    <div className="flex min-h-[calc(100vh-160px)] flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-4xl text-center">
        <div className="mx-auto mb-4 inline-flex items-center rounded-claude-full bg-colorPrimaryBgHover px-4 py-1.5 text-sm font-medium text-colorPrimary">
          {isChatType ? "AI Chat" : "AI Coding"}
        </div>
        <h1 className="mb-3 text-claude-h1 font-semibold text-claude-neutral-900">
          {title}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-claude-body-lg text-claude-neutral-600">
          {subtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-claude-xl border border-claude-neutral-200/80 bg-claude-neutral-50/85 p-5 text-left shadow-claude-sm backdrop-blur-md transition-all duration-claude-base ease-claude hover:-translate-y-0.5 hover:border-colorPrimary/30 hover:shadow-claude-md"
            >
              <div className="mb-3 text-colorPrimary">{f.icon}</div>
              <div className="mb-1 font-medium text-claude-neutral-800">
                {f.title}
              </div>
              <div className="text-sm leading-6 text-claude-neutral-600">
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button
            type="primary"
            size="large"
            className="rounded-claude-lg"
            onClick={() => login()}
          >
            {ctaText}
          </Button>
          <Button
            size="large"
            className="rounded-claude-lg"
            onClick={() => navigate("/register")}
          >
            注册新账号
          </Button>
        </div>
      </div>
    </div>
  );
}
