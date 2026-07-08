"use client";

import { Button } from "@multica/ui/components/ui/button";
import { DragStrip } from "@multica/views/platform";
import { useLogout } from "../auth";
import { useT } from "../i18n";

/**
 * Full-screen gate shown instead of the onboarding flow when this user
 * cannot create workspaces (self-host allowlist gate) and belongs to no
 * workspace yet. Reuses the step_workspace.creation_disabled_* copy —
 * same situation, earlier surface. The logout button is the only escape
 * so a user who landed here without an invitation is not trapped.
 */
export function InvitationRequiredScreen() {
  const { t } = useT("onboarding");
  const logout = useLogout();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DragStrip />
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-12">
        <div className="flex w-full max-w-md flex-col gap-4 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t(($) => $.step_workspace.creation_disabled_headline)}
          </h1>
          <p className="text-muted-foreground">
            {t(($) => $.step_workspace.creation_disabled_lede)}
          </p>
          <Button
            variant="outline"
            size="lg"
            className="mx-auto mt-2"
            onClick={logout}
          >
            {t(($) => $.step_workspace.creation_disabled_logout)}
          </Button>
        </div>
      </div>
    </div>
  );
}
