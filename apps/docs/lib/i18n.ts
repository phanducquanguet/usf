import { defineI18n } from "fumadocs-core/i18n";

// English is the default; Vietnamese (/vi/) is the only other language.
// hideLocale: 'default-locale' keeps English URLs prefix-free (`/docs/`)
// while translated locales live under `/docs/<lang>/...`.
// parser: 'dot' picks up `page.vi.mdx` and `meta.<lang>.json`.
export const i18n = defineI18n({
  languages: ["en", "vi"],
  defaultLanguage: "en",
  hideLocale: "default-locale",
  parser: "dot",
});

export type Lang = (typeof i18n.languages)[number];
