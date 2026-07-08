import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider } from "@multica/core/i18n/react";
import enOnboarding from "../locales/en/onboarding.json";

const TEST_RESOURCES = {
  en: {
    onboarding: enOnboarding,
  },
};

const mockLogout = vi.hoisted(() => vi.fn());

vi.mock("../auth", () => ({
  useLogout: () => mockLogout,
}));

vi.mock("@multica/views/platform", () => ({
  DragStrip: () => null,
}));

import { InvitationRequiredScreen } from "./invitation-required";

function I18nWrapper({ children }: { children: ReactNode }) {
  return (
    <I18nProvider locale="en" resources={TEST_RESOURCES}>
      {children}
    </I18nProvider>
  );
}

describe("InvitationRequiredScreen", () => {
  it("shows the invitation-required copy and logs out on click", () => {
    render(<InvitationRequiredScreen />, { wrapper: I18nWrapper });
    expect(
      screen.getByText("Ask your administrator for an invitation."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(mockLogout).toHaveBeenCalled();
  });
});
