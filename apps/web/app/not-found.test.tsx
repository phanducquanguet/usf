import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@multica/core/i18n/react";
import { RESOURCES } from "@multica/views/locales";
import NotFound from "./not-found";

describe("NotFound", () => {
  it("renders the not-found page in the selected locale", () => {
    render(
      <I18nProvider locale="en" resources={RESOURCES}>
        <NotFound />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The page you are looking for doesn't exist or has been moved."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to UniAI" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
