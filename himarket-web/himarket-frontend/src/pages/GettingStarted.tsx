import { Typography, Steps, Alert } from "antd";
import { UserOutlined, ApiOutlined, RocketOutlined } from "@ant-design/icons";
// import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { Card } from "../components/common";

import "./authIntake.css";

const { Title, Paragraph } = Typography;

function GettingStartedPage() {
  const { t } = useTranslation("gettingStarted");
  const steps = [
    {
      title: t("steps.registerAccount.title"),
      description: t("steps.registerAccount.description"),
      icon: <UserOutlined />,
      content: t("steps.registerAccount.content"),
    },
    {
      title: t("steps.browseApi.title"),
      description: t("steps.browseApi.description"),
      icon: <ApiOutlined />,
      content: t("steps.browseApi.content"),
    },
    {
      title: t("steps.startIntegration.title"),
      description: t("steps.startIntegration.description"),
      icon: <RocketOutlined />,
      content: t("steps.startIntegration.content"),
    },
  ];

  return (
    <Layout>
      <div className="hm-getting-started">
        <div className="hm-getting-started-inner">
          <div className="hm-getting-started-header">
            <Title level={1} className="hm-getting-started-title">
              {t("quickStart")}
            </Title>
            <Paragraph className="hm-getting-started-desc">
              {t("quickStartDesc")}
            </Paragraph>
          </div>

          <Card className="hm-getting-started-card">
            <Steps
              current={0}
              items={steps.map(step => ({
                title: step.title,
                description: step.description,
                icon: step.icon,
                content: (
                  <div className="hm-getting-started-step-content">
                    <Paragraph>{step.content}</Paragraph>
                  </div>
                ),
              }))}
            />
          </Card>

          <div className="hm-getting-started-grid">
            <Card
              className="hm-getting-started-card"
              title={t("developerDocs")}
              // extra={<Link to="/apis"><Button type="link">查看</Button></Link>}
            >
              <Paragraph>{t("developerDocsDesc")}</Paragraph>
            </Card>

            <Card
              className="hm-getting-started-card"
              title={t("sdkAndTools")}
              // extra={<Button type="link">下载</Button>}
            >
              <Paragraph>{t("sdkAndToolsDesc")}</Paragraph>
            </Card>
          </div>

          <Alert
            className="hm-getting-started-alert"
            message={t("needHelp")}
            description={t("needHelpDesc")}
            type="info"
            showIcon
            // action={
            //   <Button size="small" type="link">
            //     联系支持
            //   </Button>
            // }
          />
        </div>
      </div>
    </Layout>
  );
}

export default GettingStartedPage;
