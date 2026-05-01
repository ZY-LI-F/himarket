import type { ReactNode } from "react";
import { Skeleton } from "antd";
import { Header } from "./Header";
import bgImage from "../assets/bg.png";

interface LayoutProps {
  children: ReactNode;
  className?: string;
  loading?: boolean;
}

export function Layout({
  children,
  className = "",
  loading = false,
}: LayoutProps) {
  return (
    <div
      className={`min-h-screen flex flex-col bg-claude-neutral-50 text-claude-neutral-900 font-claude-sans ${className}`}
    >
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[1] min-h-screen w-full"
        style={{
          backgroundImage: `linear-gradient(135deg, color-mix(in srgb, var(--color-brand-surface-tint) 72%, transparent), color-mix(in srgb, var(--color-neutral-50) 92%, transparent)), url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2] min-h-screen w-full bg-claude-neutral-50/55"
        style={{ backdropFilter: "blur(72px)" }}
      />
      <Header />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1">
          <div className="mx-auto h-full w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="space-y-8 py-8">
                <div className="text-center mb-8">
                  <Skeleton.Input
                    active
                    size="large"
                    style={{ width: 300, height: 48, margin: "0 auto 16px" }}
                  />
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: "80%", height: 24, margin: "0 auto" }}
                  />
                </div>

                <div className="flex justify-center mb-8">
                  <div className="relative w-full max-w-2xl">
                    <Skeleton.Input
                      active
                      size="large"
                      style={{ width: "100%", height: 40 }}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: 200, height: 32 }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-full rounded-claude-lg border border-claude-neutral-200/80 bg-claude-neutral-50/85 p-4 shadow-claude-sm"
                    >
                      <div className="flex items-start space-x-4">
                        <Skeleton.Avatar size={48} active />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <Skeleton.Input
                              active
                              size="small"
                              style={{ width: 120 }}
                            />
                            <Skeleton.Input
                              active
                              size="small"
                              style={{ width: 60 }}
                            />
                          </div>
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 80, marginBottom: 8 }}
                          />
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: "100%", marginBottom: 12 }}
                          />
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: "100%", marginBottom: 12 }}
                          />
                          <div className="flex items-center justify-between">
                            <Skeleton.Input
                              active
                              size="small"
                              style={{ width: 60 }}
                            />
                            <Skeleton.Input
                              active
                              size="small"
                              style={{ width: 80 }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
        <footer
          aria-label="Site footer"
          className="mt-auto border-t border-claude-neutral-200/70 bg-claude-neutral-50/70 backdrop-blur-md"
        >
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1 px-4 py-3 text-xs text-claude-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span className="font-medium text-claude-neutral-700">
              HiMarket
            </span>
            <span>Enterprise AI Marketplace</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
