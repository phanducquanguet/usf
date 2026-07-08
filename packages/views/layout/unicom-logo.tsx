"use client";

import { cn } from "@multica/ui/lib/utils";
import logoLight from "../assets/unicom-logo-light.png";
import logoDark from "../assets/unicom-logo-dark.png";

// Asset imports are a string URL under vite and StaticImageData under Next.
const asUrl = (asset: unknown): string =>
  typeof asset === "string" ? asset : (asset as { src: string }).src;

/** UNICOM logo lockup, theme-aware (light/dark PNG pair). */
export function UnicomLogo({
  className,
  hideTagline = false,
}: {
  className?: string;
  hideTagline?: boolean;
}) {
  // The "AI SOFTWARE FACTORY" tagline is baked into the bottom ~37% of the PNG.
  // Clip it by scaling the image up inside an overflow-hidden box aligned to top.
  if (hideTagline) {
    return (
      <span className={cn("inline-flex items-start overflow-hidden", className)}>
        <img
          src={asUrl(logoLight)}
          alt="UNICOM"
          className="h-[159%] w-auto max-w-none dark:hidden"
        />
        <img
          src={asUrl(logoDark)}
          alt="UNICOM"
          className="hidden h-[159%] w-auto max-w-none dark:block"
        />
      </span>
    );
  }
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
