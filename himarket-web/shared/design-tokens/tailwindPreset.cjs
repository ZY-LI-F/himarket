const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        claude: {
          brand: {
            DEFAULT: "#D97757",
            primary: "#D97757",
            hover: "#C9633F",
            active: "#B85428",
            surfaceTint: "#FBF0EA",
          },
          neutral: {
            50: "#FAFAF7",
            100: "#F4F3EE",
            200: "#E8E6DD",
            300: "#D6D3C7",
            400: "#B8B4A6",
            500: "#8B8678",
            600: "#5C5749",
            700: "#3D3A30",
            800: "#262420",
            900: "#141312",
          },
          semantic: {
            success: "#3F9F60",
            warning: "#D89C3F",
            error: "#C7503D",
            info: "#3F7BC9",
          },
        },
      },
      fontFamily: {
        "claude-sans": ['Inter, "Söhne", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],
        "claude-serif": ['"Tiempos Text", "Source Serif Pro", Georgia, "Times New Roman", serif'],
        "claude-mono": ['"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'],
      },
      fontSize: {
        "claude-display": ["56px", { lineHeight: "64px" }],
        "claude-h1": ["40px", { lineHeight: "48px" }],
        "claude-h2": ["32px", { lineHeight: "40px" }],
        "claude-h3": ["24px", { lineHeight: "32px" }],
        "claude-h4": ["20px", { lineHeight: "28px" }],
        "claude-body-lg": ["18px", { lineHeight: "28px" }],
        "claude-body": ["16px", { lineHeight: "24px" }],
        "claude-body-sm": ["14px", { lineHeight: "20px" }],
        "claude-caption": ["12px", { lineHeight: "16px" }],
      },
      spacing: {
        "claude-0": "0px",
        "claude-4": "4px",
        "claude-8": "8px",
        "claude-12": "12px",
        "claude-16": "16px",
        "claude-20": "20px",
        "claude-24": "24px",
        "claude-32": "32px",
        "claude-40": "40px",
        "claude-48": "48px",
        "claude-64": "64px",
        "claude-80": "80px",
        "claude-96": "96px",
      },
      borderRadius: {
        "claude-none": "0px",
        "claude-sm": "4px",
        "claude-md": "8px",
        "claude-lg": "12px",
        "claude-xl": "20px",
        "claude-full": "9999px",
      },
      boxShadow: {
        "claude-sm": "0 1px 2px rgba(20,19,18,0.06)",
        "claude-md": "0 4px 12px rgba(20,19,18,0.08)",
        "claude-lg": "0 12px 32px rgba(20,19,18,0.12)",
        "claude-focus": "0 0 0 3px rgba(217,119,87,0.32)",
      },
      transitionDuration: {
        "claude-fast": "120ms",
        "claude-base": "200ms",
        "claude-slow": "320ms",
      },
      transitionTimingFunction: {
        claude: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    },
  },
};

module.exports = tailwindPreset;
