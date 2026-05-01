export const fontFamilies = {
  sans: 'Inter, "Söhne", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: '"Tiempos Text", "Source Serif Pro", Georgia, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export type TypeScaleStep = {
  readonly fontSize: number;
  readonly lineHeight: number;
};

export const typeScale = {
  display: { fontSize: 56, lineHeight: 64 },
  h1: { fontSize: 40, lineHeight: 48 },
  h2: { fontSize: 32, lineHeight: 40 },
  h3: { fontSize: 24, lineHeight: 32 },
  h4: { fontSize: 20, lineHeight: 28 },
  "body-lg": { fontSize: 18, lineHeight: 28 },
  body: { fontSize: 16, lineHeight: 24 },
  "body-sm": { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TypeScaleStep>;

export type FontFamilyToken = keyof typeof fontFamilies;
export type TypeScaleToken = keyof typeof typeScale;
