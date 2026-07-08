"use client";

/**
 * DocsDialog — in-app documentation viewer.
 *
 * Renders the docs bundled at build time from apps/docs/content/docs
 * (see scripts/generate-docs-content.mjs), so it works without leaving
 * the app. Internal doc links switch pages inside the dialog; external
 * links open in a new tab.
 */

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@multica/ui/components/ui/dialog";
import { cn } from "@multica/ui/lib/utils";
import { DOC_SECTIONS_BY_LANG } from "./docs-content.generated";
import { UnicomLogo } from "./unicom-logo";
import { useT } from "../i18n";

interface DocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Page to show when the dialog opens; defaults to the index. */
  slug?: string;
}

export default function DocsDialog({
  open,
  onOpenChange,
  slug = "index",
}: DocsDialogProps) {
  const { t, i18n } = useT("layout");
  const [activeSlug, setActiveSlug] = useState(slug);

  // Jump to the requested page each time the dialog is (re)opened.
  useEffect(() => {
    if (open) setActiveSlug(slug);
  }, [open, slug]);

  // Docs content follows the app language; anything non-vi reads English.
  const sections =
    DOC_SECTIONS_BY_LANG[i18n?.language?.startsWith("vi") ? "vi" : "en"];

  // Section labels follow the app language; unknown keys fall back to the
  // English label baked into the generated content.
  const sectionLabel = (section: { label: string | null; labelKey: string | null }) => {
    if (!section.labelKey) return section.label;
    const translated = t(($) => {
      const sections = $.help.sections as Record<string, string>;
      return sections[section.labelKey!] ?? "";
    });
    return translated || section.label;
  };

  const pagesBySlug = useMemo(
    () =>
      new Map(sections.flatMap((s) => s.pages).map((p) => [p.slug, p])),
    [sections],
  );
  const active = pagesBySlug.get(activeSlug);

  // Internal doc links (/agents, /providers#claude-code) switch the page in
  // place; anything unknown or absolute opens in a new tab.
  // ponytail: in-page #anchor targets are ignored (headings carry no ids);
  // add rehype-slug + scroll handling if anchor precision matters.
  const components: Components = useMemo(
    () => ({
      a: ({ href, children }) => {
        if (href?.startsWith("/")) {
          const slug = href.slice(1).split("#")[0] || "index";
          if (pagesBySlug.has(slug)) {
            return (
              <a
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSlug(slug);
                }}
              >
                {children}
              </a>
            );
          }
          // Internal link to a page not bundled in the viewer — render as
          // plain text instead of sending the user to an external site.
          return <span>{children}</span>;
        }
        if (href?.startsWith("#")) {
          return <a onClick={(e) => e.preventDefault()}>{children}</a>;
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      },
    }),
    [pagesBySlug],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,calc(100vh-2rem))] max-w-5xl sm:max-w-5xl flex-col overflow-hidden p-0 gap-0">
        {/* Brand header */}
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3 pr-12">
          <UnicomLogo className="h-6" hideTagline />
          <DialogTitle className="text-sm font-semibold">
            {t(($) => $.help.docs)}
          </DialogTitle>
        </div>

        <div className="flex min-h-0 flex-1 flex-row">
          {/* Page nav */}
          <nav className="hidden sm:block w-56 shrink-0 overflow-y-auto border-r p-3">
            {sections.map((section, i) => (
              <div key={section.label ?? i}>
                {section.label && (
                  <div className="px-2 pb-1 pt-4 text-xs font-medium text-muted-foreground">
                    {sectionLabel(section)}
                  </div>
                )}
                {section.pages.map((page) => (
                  <button
                    key={page.slug}
                    type="button"
                    onClick={() => setActiveSlug(page.slug)}
                    className={cn(
                      "block w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer",
                      page.slug === activeSlug
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {page.title}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Page content; key resets scroll on page switch */}
          <div key={activeSlug} className="flex-1 min-w-0 overflow-y-auto">
            <div className="mx-auto max-w-3xl p-6">
              <h1 className="mb-4 text-xl font-semibold">{active?.title}</h1>
              <div className="rich-text-editor readonly text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                  {active?.content ?? ""}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
