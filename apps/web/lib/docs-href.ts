import type { SupportedLocale } from "@multica/core/i18n";

export function docsHrefForLocale(_locale: SupportedLocale): string {
  // Docs ship in English only for the supported app locales (vi falls back).
  return "/docs";
}
