import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// Orama has no Vietnamese language pack (`locale=vi` throws
// LANGUAGE_NOT_SUPPORTED), and the English tokenizer's stemmer mangles
// diacritics. Vietnamese is whitespace-separated Latin script, so keeping
// Unicode letter/digit runs whole is enough for exact-word recall.
function tokenizeVietnamese(raw: string): string[] {
  return raw.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export const { GET } = createFromSource(source, {
  localeMap: {
    vi: {
      components: {
        tokenizer: {
          language: "english",
          normalizationCache: new Map(),
          tokenize: tokenizeVietnamese,
        },
      },
    },
  },
});
