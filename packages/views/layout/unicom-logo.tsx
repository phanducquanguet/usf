"use client";

import { cn } from "@multica/ui/lib/utils";
import logoLight from "../assets/unicom-logo-light.png";
import logoDark from "../assets/unicom-logo-dark.png";

// Asset imports are a string URL under vite and StaticImageData under Next.
const asUrl = (asset: unknown): string =>
  typeof asset === "string" ? asset : (asset as { src: string }).src;

/** UNICOM logo lockup, theme-aware (light/dark PNG pair). */
export function UnicomLogo({ className }: { className?: string }) {
  return (
    <>
      <img
        src={asUrl(logoLight)}
        alt="UNICOM — AI Software Factory"
        className={cn("w-auto dark:hidden", className)}
      />
      <img
        src={asUrl(logoDark)}
        alt="UNICOM — AI Software Factory"
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  );
}
