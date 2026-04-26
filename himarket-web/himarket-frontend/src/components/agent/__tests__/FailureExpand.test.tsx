import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FailureExpand } from "../FailureExpand";

describe("FailureExpand", () => {
  it("shows a red failed badge and opens failure details by default", () => {
    render(<FailureExpand failureExcerpt="mock stderr: bridge task failed" />);

    expect(screen.getByTestId("failure-badge")).toHaveClass("bg-red-600");
    expect(
      screen.getByRole("region", { name: "Failure details" })
    ).toHaveTextContent("mock stderr: bridge task failed");
    expect(
      screen.getByRole("button", { name: "Show failure" })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("can collapse and reopen the failure panel", () => {
    render(<FailureExpand failureExcerpt="stack trace excerpt" />);

    fireEvent.click(screen.getByRole("button", { name: "Show failure" }));
    expect(
      screen.queryByRole("region", { name: "Failure details" })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show failure" }));
    expect(
      screen.getByRole("region", { name: "Failure details" })
    ).toHaveTextContent("stack trace excerpt");
  });
});
