export const motionDurations = {
  fast: 120,
  base: 200,
  slow: 320,
} as const;

export const motionDurationMs = {
  fast: "120ms",
  base: "200ms",
  slow: "320ms",
} as const;

export const motionEasing = {
  standard: "cubic-bezier(0.2, 0.8, 0.2, 1)",
} as const;

export const motion = {
  duration: motionDurations,
  durationMs: motionDurationMs,
  easing: motionEasing,
} as const;

export type MotionDurationToken = keyof typeof motionDurations;
export type MotionEasingToken = keyof typeof motionEasing;
