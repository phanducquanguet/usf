"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@multica/ui/lib/utils";

// useLayoutEffect warns during SSR; the server branch never runs effects anyway.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type RevealState = "static" | "hidden" | "visible";

/**
 * Reveal-on-scroll wrapper for the portal landing. Pairs with the
 * `.portal-reveal` CSS in app/custom.css (which also handles
 * prefers-reduced-motion by disabling the transition entirely).
 *
 * Server markup ships fully visible so crawlers and no-JS render everything;
 * before first client paint, elements still below the fold are hidden and
 * transitioned in as they enter the viewport.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<RevealState>("static");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top >= window.innerHeight) {
      setState("hidden");
    }
  }, []);

  useEffect(() => {
    if (state !== "hidden") return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [state]);

  return (
    <div
      ref={ref}
      className={cn(
        state !== "static" && "portal-reveal",
        state === "visible" && "portal-reveal-visible",
        className,
      )}
      style={delayMs > 0 && state !== "static" ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
