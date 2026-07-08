#!/usr/bin/env node
// Regenerates packages/views/layout/docs-content.generated.ts from the
// English MDX files in apps/docs/content/docs (source of truth), following
// the section order in meta.json.
//
// Run via `pnpm generate:docs` after editing docs content.
//
// MDX-specific JSX (Callout, Steps, Mermaid, …) is downgraded to plain
// markdown so the in-app viewer can render it with react-markdown.
// ponytail: regex-based transform, not fence-aware; none of the handled
// tags appear inside code fences today. Move to a real MDX parser if that
// ever changes.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = resolve(repoRoot, "apps/docs/content/docs");
const outPath = resolve(repoRoot, "packages/views/layout/docs-content.generated.ts");

const meta = JSON.parse(readFileSync(resolve(docsDir, "meta.json"), "utf8"));
if (!Array.isArray(meta.pages)) {
  throw new Error("meta.json: expected top-level \"pages\" array");
}

// App locales; non-en locales fall back to the English page when no
// .<locale>.mdx translation exists.
const LOCALES = ["en", "vi"];
// Features temporarily closed — pages hidden from the in-app viewer.
const EXCLUDED_PAGES = new Set(["desktop-app"]);

function transform(mdx) {
  let src = mdx;

  // Frontmatter → title
  let title = "";
  src = src.replace(/^---\n([\s\S]*?)\n---\n/, (_, fm) => {
    const m = fm.match(/^title:\s*"?(.*?)"?\s*$/m);
    if (m) title = m[1];
    return "";
  });

  // import lines
  src = src.replace(/^import .*$\n?/gm, "");

  // <Mermaid chart={`...`} /> → fenced mermaid code block (diagram source)
  src = src.replace(
    /<Mermaid\s+chart=\{`([\s\S]*?)`\}\s*\/>/g,
    (_, chart) => "```mermaid\n" + chart.trim() + "\n```",
  );

  // <Callout type="info" title="T">body</Callout> → blockquote
  src = src.replace(
    /<Callout([^>]*)>([\s\S]*?)<\/Callout>/g,
    (_, attrs, body) => {
      const t = attrs.match(/title="([^"]*)"/)?.[1];
      const lines = body.trim().split("\n");
      if (t) lines.unshift(`**${t}**`, "");
      return lines.map((l) => (l ? `> ${l}` : ">")).join("\n");
    },
  );

  // <NumberedCard number="01" title="T" href="/x" tag="G">body</NumberedCard>
  src = src.replace(
    // \s guard: don't match the <NumberedCards> wrapper tag
    /<NumberedCard(\s[^>]*)>([\s\S]*?)<\/NumberedCard>/g,
    (_, attrs, body) => {
      const get = (name) => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];
      const num = get("number");
      const t = get("title") ?? "";
      const href = get("href");
      const tag = get("tag");
      const head = [
        num ? `${num} —` : null,
        href ? `[${t}](${href})` : t,
        tag ? `· ${tag}` : null,
      ]
        .filter(Boolean)
        .join(" ");
      return `**${head}**\n\n${body.trim()}`;
    },
  );

  // Wrapper/decoration tags whose children are already valid markdown
  src = src.replace(
    /<\/?(?:Steps|Step|Cards|Card|NumberedCards|NumberedSteps)[^>]*>/g,
    "",
  );
  // Self-closing visual components with no markdown equivalent
  src = src.replace(/<(?:ArchitectureDiagram|VideoEmbed)[^>]*\/>/g, "");

  // No external git links in the in-app docs: unwrap the link, keep the text.
  src = src.replace(
    /\[([^\]]*)\]\(https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org)[^)]*\)/g,
    "$1",
  );

  // Unwrap internal links to pages excluded from the viewer.
  for (const slug of EXCLUDED_PAGES) {
    src = src.replace(
      new RegExp(`\\[([^\\]]*)\\]\\(/${slug}(?:#[^)]*)?\\)`, "g"),
      "$1",
    );
  }

  // Collapse the blank runs the removals leave behind
  src = src.replace(/\n{3,}/g, "\n\n").trim();

  return { title, content: src };
}

// Stable i18n key for a section label; translations live in
// packages/views/locales/{en,vi}/layout.json under help.sections.
const labelKey = (label) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function buildSections(locale) {
  const sections = [];
  let current = { label: null, labelKey: null, pages: [] };
  for (const entry of meta.pages) {
    const sep = entry.match(/^---(.*)---$/);
    if (sep) {
      if (current.pages.length > 0) sections.push(current);
      current = { label: sep[1], labelKey: labelKey(sep[1]), pages: [] };
      continue;
    }
    if (EXCLUDED_PAGES.has(entry)) continue;
    const enPath = resolve(docsDir, `${entry}.mdx`);
    // Folder-based sections (e.g. developers/) are contributor docs, not
    // end-user docs — skip them in the in-app viewer.
    if (!existsSync(enPath)) continue;
    const localized = resolve(docsDir, `${entry}.${locale}.mdx`);
    const path = locale !== "en" && existsSync(localized) ? localized : enPath;
    const mdx = readFileSync(path, "utf8");
    const { title, content } = transform(mdx);
    current.pages.push({ slug: entry, title: title || entry, content });
  }
  if (current.pages.length > 0) sections.push(current);
  return sections;
}

const sectionsByLang = Object.fromEntries(
  LOCALES.map((locale) => [locale, buildSections(locale)]),
);

const out = `// AUTO-GENERATED by scripts/generate-docs-content.mjs.
// Do not edit by hand — edit apps/docs/content/docs/*.mdx
// and run \`pnpm generate:docs\`.

export interface DocPage {
  slug: string;
  title: string;
  content: string;
}

export interface DocSection {
  label: string | null;
  /** Key into layout.json help.sections for the localized label */
  labelKey: string | null;
  pages: DocPage[];
}

export type DocsLang = ${LOCALES.map((l) => JSON.stringify(l)).join(" | ")};

export const DOC_SECTIONS_BY_LANG: Record<DocsLang, DocSection[]> = ${JSON.stringify(sectionsByLang, null, 2)};
`;

writeFileSync(outPath, out);
for (const [locale, sections] of Object.entries(sectionsByLang)) {
  console.log(
    `${locale}: ${sections.reduce((n, s) => n + s.pages.length, 0)} pages`,
  );
}
console.log(`Wrote ${outPath}`);
