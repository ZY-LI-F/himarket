import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UserInfo } from "./UserInfo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { HiMarket, Logo } from "./icon";
import { usePortalConfig } from "../context/PortalConfigContext";

export function Header() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const { visibleTabs, loading } = usePortalConfig();
  const { t } = useTranslation("header");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const isActiveTab = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <nav
      className={`
        sticky top-0 z-50 border-b transition-all duration-claude-base ease-claude
        ${
          isScrolled
            ? "border-claude-neutral-200/80 bg-claude-neutral-50/90 shadow-claude-sm"
            : "border-claude-neutral-200/40 bg-claude-neutral-50/70 backdrop-blur-md"
        }
      `}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2 rounded-claude-full px-1 py-1 transition-all duration-claude-base ease-claude hover:bg-colorPrimaryBgHover"
              aria-label="HiMarket home"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-claude-lg bg-claude-neutral-900 shadow-claude-sm">
                <Logo className="w-6 h-6" />
              </div>
              <HiMarket />
            </Link>
            <div className="hidden h-7 w-px bg-claude-neutral-200 sm:block" />
            {loading ? (
              <div className="hidden items-center gap-2 overflow-hidden md:flex">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 rounded-claude-full bg-claude-neutral-200/70 animate-pulse"
                    style={{ width: `${56 + (i % 3) * 8}px` }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-hide animate-in fade-in duration-300">
                {visibleTabs.map(tab => {
                  const active = isActiveTab(tab.path);
                  return (
                    <Link
                      key={tab.path}
                      to={tab.path}
                      aria-current={active ? "page" : undefined}
                      className={`
                        whitespace-nowrap rounded-claude-full px-4 py-2 text-sm font-medium
                        transition-all duration-claude-base ease-claude
                        ${
                          active
                            ? "bg-colorPrimary text-claude-neutral-50 shadow-claude-sm"
                            : "text-claude-neutral-600 hover:bg-colorPrimaryBgHover hover:text-colorPrimary"
                        }
                      `}
                    >
                      {t(tab.label)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {location.pathname !== "/login" &&
              location.pathname !== "/register" && <UserInfo />}
          </div>
        </div>
      </div>
    </nav>
  );
}
