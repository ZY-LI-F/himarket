export const shadows = {
  sm: "0 1px 2px rgba(20,19,18,0.06)",
  md: "0 4px 12px rgba(20,19,18,0.08)",
  lg: "0 12px 32px rgba(20,19,18,0.12)",
  focus: "0 0 0 3px rgba(217,119,87,0.32)",
} as const;

export type ShadowToken = keyof typeof shadows;
