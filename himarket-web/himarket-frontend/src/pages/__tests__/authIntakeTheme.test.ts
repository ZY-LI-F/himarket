import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const AUTH_INTAKE_TARGETS = [
  "src/pages/Login.tsx",
  "src/pages/Register.tsx",
  "src/pages/Callback.tsx",
  "src/pages/OidcCallback.tsx",
  "src/pages/Profile.tsx",
  "src/pages/GettingStarted.tsx",
  "src/pages/authIntake.css",
] as const;
const INLINE_HEX_COLOR = /#[\dA-Fa-f]{3,8}/;
const TAILWIND_ARBITRARY_HEX_COLOR = new RegExp("\\[" + "#");

function readTarget(file: string) {
  return readFileSync(join(process.cwd(), file), "utf8");
}

describe("auth intake theme", () => {
  it("keeps modified onboarding files free of inline hex colors", () => {
    for (const file of AUTH_INTAKE_TARGETS) {
      const content = readTarget(file);
      expect(content, file).not.toMatch(INLINE_HEX_COLOR);
      expect(content, file).not.toMatch(TAILWIND_ARBITRARY_HEX_COLOR);
    }
  });

  it("uses neutral token surfaces for callback shells", () => {
    expect(readTarget("src/pages/Callback.tsx")).toContain("hm-callback-shell");
    expect(readTarget("src/pages/OidcCallback.tsx")).toContain(
      "hm-callback-shell"
    );

    const styles = readTarget("src/pages/authIntake.css");
    expect(styles).toContain("background: var(--color-neutral-50)");
    expect(styles).toContain("border: 1px solid var(--color-neutral-200)");
  });

  it("routes profile read-only fields through the themed FormField atom", () => {
    const profilePage = readTarget("src/pages/Profile.tsx");

    expect(profilePage).toContain("FormField.Input");
    expect(profilePage).toContain("hm-profile-field");
  });
});
