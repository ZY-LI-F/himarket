import React, { useEffect, useState } from "react";
// import { useLocation } from 'react-router-dom'

import { Layout } from "../components/Layout";
import aliyunIcon from "../assets/aliyun.png";
import githubIcon from "../assets/github.png";
import googleIcon from "../assets/google.png";
import { message } from "antd";
import { useTranslation } from "react-i18next";
import APIs, { type IIdentity, type IIdpProvider } from "../lib/apis";
import { Button, Card, FormField } from "../components/common";

import "./authIntake.css";

const providerIcons: Record<string, string> = {
  aliyun: aliyunIcon,
  github: githubIcon,
  google: googleIcon,
};

interface UserProfile {
  avatar?: string;
  name?: string;
  email?: string;
  provider?: string;
}

const parseUserProfile = (identity: IIdentity): UserProfile => {
  if (!identity) return {};
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(identity.rawInfoJson);
  } catch {
    // 忽略解析错误
  }
  // 针对不同provider做兼容
  if (identity.provider === "github") {
    return {
      avatar: raw.avatar_url as string,
      name: (raw.name as string) || (raw.login as string),
      email: raw.email as string,
      provider: "github",
    };
  } else if (identity.provider === "google") {
    return {
      avatar: raw.picture as string,
      name: raw.name as string,
      email: raw.email as string,
      provider: "google",
    };
  } else if (identity.provider === "aliyun") {
    return {
      avatar: raw.avatar as string,
      name: raw.name as string,
      email: raw.email as string,
      provider: "aliyun",
    };
  }
  return {};
};

const Profile: React.FC = () => {
  const { t } = useTranslation("profile");
  const [providers, setProviders] = useState<IIdpProvider[]>([]);
  const [identities, setIdentities] = useState<IIdentity[]>([]);

  useEffect(() => {
    // 使用OidcController的接口获取OIDC提供商
    APIs.getOidcProviders()
      .then(response => {
        console.log("OIDC providers response:", response);

        // 处理不同的响应格式
        let providersData: IIdpProvider[];
        if (Array.isArray(response)) {
          providersData = response;
        } else if (response && Array.isArray(response.data)) {
          providersData = response.data;
        } else if (response && response.data) {
          console.warn("Unexpected response format:", response);
          providersData = [];
        } else {
          providersData = [];
        }

        console.log("Processed providers data:", providersData);
        setProviders(providersData);
      })
      .catch(error => {
        console.error("Failed to fetch OIDC providers:", error);
        setProviders([]);
      });
  }, []);

  useEffect(() => {
    APIs.developersListIdentities()
      .then(res => {
        setIdentities(res.data || []);
      })
      .catch(() => setIdentities([]));
  }, []);

  // OIDC绑定功能 - 暂时简化实现
  const handleBinding = (provider: string) => {
    // 由于简化了OIDC流程，绑定功能需要单独实现
    // 暂时提示用户功能开发中
    message.info(t("bindingComingSoon", { provider }));

    // 后续可以考虑以下实现方案：
    // 1. 为绑定功能创建专门的回调页面
    // 2. 通过URL参数区分登录和绑定模式
    // 3. 或者使用弹窗方式处理绑定流程
  };

  // 判断provider是否已绑定
  const isBound = (provider: string) =>
    identities.some(id => id.provider === provider);

  // 取第一个已绑定身份展示个人信息
  const mainIdentity = identities[0];
  const userProfile = mainIdentity ? parseUserProfile(mainIdentity) : null;
  const profileFields = [
    { key: "name", label: t("displayName"), value: userProfile?.name },
    { key: "email", label: t("email"), value: userProfile?.email },
    {
      key: "provider",
      label: t("identity"),
      value: userProfile?.provider
        ? t("fromProvider", { provider: userProfile.provider })
        : undefined,
    },
  ].filter((field): field is { key: string; label: string; value: string } =>
    Boolean(field.value)
  );

  return (
    <Layout>
      <div className="hm-profile-page">
        <div className="hm-profile-panel">
          <Card className="hm-profile-card">
            <h2 className="hm-profile-title">{t("title")}</h2>
            {/* 个人信息展示区 */}
            {userProfile && (
              <div className="hm-profile-identity">
                {userProfile.avatar && (
                  <img
                    src={userProfile.avatar}
                    alt="avatar"
                    className="hm-profile-avatar"
                  />
                )}
                <div className="hm-profile-form">
                  {profileFields.map(field => (
                    <label className="hm-profile-field" key={field.key}>
                      <span className="hm-profile-field-label">
                        {field.label}
                      </span>
                      <FormField.Input value={field.value} readOnly />
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="hm-profile-provider-list">
              {!Array.isArray(providers) || providers.length === 0 ? (
                <div className="hm-profile-empty">{t("noThirdParty")}</div>
              ) : (
                providers.map(provider => {
                  const bound = isBound(provider.provider);
                  const icon = providerIcons[provider.provider] || "";
                  return (
                    <div
                      key={provider.provider}
                      className={`hm-profile-provider ${bound ? "hm-profile-provider--bound" : ""}`}
                    >
                      {icon && (
                        <img
                          src={icon}
                          alt={provider.provider}
                          className="hm-profile-provider-icon"
                        />
                      )}
                      <span className="hm-profile-provider-name">
                        {provider.name || provider.provider}
                      </span>
                      {bound ? (
                        <span className="hm-profile-provider-status">
                          {t("bound")}
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => handleBinding(provider.provider)}
                          className="hm-profile-bind-button"
                          size="small"
                        >
                          {t("bind")}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
