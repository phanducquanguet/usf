import { describe, expect, it } from "vitest";
import { detectInstallOS, INSTALL_COMMANDS } from "./install-command";

describe("detectInstallOS", () => {
  it("returns windows for a Windows user agent", () => {
    expect(
      detectInstallOS(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      ),
    ).toBe("windows");
  });

  it("returns unix for a macOS user agent", () => {
    expect(
      detectInstallOS(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      ),
    ).toBe("unix");
  });

  it("returns unix for a Linux user agent", () => {
    expect(
      detectInstallOS("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"),
    ).toBe("unix");
  });

  it("defaults to unix when the user agent is empty", () => {
    expect(detectInstallOS("")).toBe("unix");
  });
});

describe("INSTALL_COMMANDS", () => {
  it("uses the shell installer for unix", () => {
    expect(INSTALL_COMMANDS.unix).toContain("install.sh");
    expect(INSTALL_COMMANDS.unix).toContain("| bash");
  });

  it("uses the PowerShell installer for windows", () => {
    expect(INSTALL_COMMANDS.windows).toContain("install.ps1");
    expect(INSTALL_COMMANDS.windows).toContain("| iex");
    expect(INSTALL_COMMANDS.windows).toContain("irm ");
  });
});
