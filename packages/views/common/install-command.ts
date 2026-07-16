/**
 * CLI install commands per OS. The UI detects the visitor's OS to show the
 * right one-liner by default; users can still switch manually because the
 * command may be copied for another machine.
 */
export type InstallOS = "unix" | "windows";

export const INSTALL_COMMANDS: Record<InstallOS, string> = {
  unix: "curl -fsSL https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.sh | bash",
  windows:
    "irm https://raw.githubusercontent.com/phanducquanguet/usf/feature/customer-portal/scripts/install.ps1 | iex",
};

export const INSTALL_OS_LABELS: Record<InstallOS, string> = {
  unix: "macOS / Linux",
  windows: "Windows",
};

export function detectInstallOS(userAgent?: string): InstallOS {
  const ua =
    userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  return /windows/i.test(ua) ? "windows" : "unix";
}
