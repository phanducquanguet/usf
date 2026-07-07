import { LoginPage } from "@multica/views/auth";
import { DragStrip } from "@multica/views/platform";
import logoLight from "../assets/unicom-logo-light.png";
import logoDark from "../assets/unicom-logo-dark.png";

/** UNICOM logo lockup, theme-aware (light/dark PNG pair). */
function UnicomLogo() {
  return (
    <>
      <img
        src={logoLight}
        alt="UNICOM — AI Software Factory"
        className="h-12 w-auto dark:hidden"
      />
      <img
        src={logoDark}
        alt="UNICOM — AI Software Factory"
        className="hidden h-12 w-auto dark:block"
      />
    </>
  );
}

function requireRuntimeAppUrl(): string {
  const runtimeConfig = window.desktopAPI.runtimeConfig;
  if (!runtimeConfig.ok) {
    throw new Error(
      "Invariant violated: DesktopLoginPage rendered before App accepted runtime config",
    );
  }
  return runtimeConfig.config.appUrl;
}

export function DesktopLoginPage() {
  const webUrl = requireRuntimeAppUrl();
  const handleGoogleLogin = () => {
    // Open web login page in the default browser with platform=desktop flag.
    // The web callback will redirect back via multica:// deep link with the token.
    window.desktopAPI.openExternal(
      `${webUrl}/login?platform=desktop`,
    );
  };

  return (
    <div className="flex h-screen flex-col">
      <DragStrip />
      <LoginPage
        logo={<UnicomLogo />}
        onSuccess={() => {
          // Auth store update triggers AppContent re-render → shows DesktopShell.
          // Initial workspace navigation happens in routes.tsx via IndexRedirect.
        }}
        onGoogleLogin={handleGoogleLogin}
      />
    </div>
  );
}
