export const spacing = {
  "0": 0,
  "4": 4,
  "8": 8,
  "12": 12,
  "16": 16,
  "20": 20,
  "24": 24,
  "32": 32,
  "40": 40,
  "48": 48,
  "64": 64,
  "80": 80,
  "96": 96,
} as const;

export const spacingPx = {
  "0": "0px",
  "4": "4px",
  "8": "8px",
  "12": "12px",
  "16": "16px",
  "20": "20px",
  "24": "24px",
  "32": "32px",
  "40": "40px",
  "48": "48px",
  "64": "64px",
  "80": "80px",
  "96": "96px",
} as const;

export type SpacingToken = keyof typeof spacing;
