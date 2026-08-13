import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import enLayout from "../locales/en/layout.json";
import { HelpLauncher } from "./help-launcher";

// react-i18next isn't initialised in the views test env, so resolve the
// selector against the real en/layout.json to assert on actual copy.
vi.mock("../i18n", () => ({
  useT: () => ({
    t: (sel: (r: typeof enLayout) => string) => sel(enLayout),
  }),
}));

// The fork's HelpLauncher is a single button that opens the embedded docs
// viewer (no dropdown menu / server-version row — that upstream menu was
// intentionally not adopted).
const openDocs = vi.fn();
vi.mock("@multica/core/docs", () => ({
  useDocsViewerStore: (
    selector: (s: { openDocs: (path?: string) => void }) => unknown,
  ) => selector({ openDocs }),
}));

describe("HelpLauncher", () => {
  it("renders a docs button labeled from the layout locale", () => {
    render(<HelpLauncher />);
    expect(
      screen.getByRole("button", { name: enLayout.help.docs }),
    ).toBeInTheDocument();
  });

  it("opens the embedded docs viewer on click", () => {
    render(<HelpLauncher />);
    fireEvent.click(screen.getByRole("button", { name: enLayout.help.docs }));
    expect(openDocs).toHaveBeenCalledTimes(1);
  });
});
