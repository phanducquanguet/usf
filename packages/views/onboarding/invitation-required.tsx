"use client";

import { LogOut } from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { DragStrip } from "@multica/views/platform";
import { useLogout } from "../auth";
import { useT } from "../i18n";
import { UnicomLogo } from "../layout/unicom-logo";

/**
 * Full-screen gate shown instead of the onboarding flow when this user
 * cannot create workspaces (self-host allowlist gate) and belongs to no
 * workspace yet. Reuses the step_workspace.creation_disabled_* copy and
 * the onboarding editorial voice (eyebrow / serif headline / lede) so it
 * reads as part of the same flow it replaces. The logout button is the
 * only escape so a user who landed here without an invitation is not
 * trapped.
 */
export function InvitationRequiredScreen() {
  const { t } = useT("onboarding");
  const logout = useLogout();
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DragStrip />
      <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        <div className="w-full max-w-[560px]">
          <UnicomLogo className="mb-10 h-7" hideTagline />
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {t(($) => $.step_workspace.creation_disabled_eyebrow)}
          </div>
          <h1 className="text-balance font-serif text-[36px] font-medium leading-[1.1] tracking-tight text-foreground">
            {t(($) => $.step_workspace.creation_disabled_headline)}
          </h1>
          <p className="mt-4 text-[15.5px] leading-[1.55] text-foreground/80">
            {t(($) => $.step_workspace.creation_disabled_lede)}
          </p>
          <div className="mt-8">
            <Button variant="outline" size="lg" onClick={logout}>
              <LogOut className="h-4 w-4" />
              {t(($) => $.step_workspace.creation_disabled_logout)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
