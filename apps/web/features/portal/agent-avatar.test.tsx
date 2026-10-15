import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { AgentAvatar } from "./agent-avatar";

describe("AgentAvatar", () => {
  it("renders an emoji avatar as text instead of an image URL", () => {
    const { container } = render(<AgentAvatar src="emoji:🐳" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("🐳");
  });
});
