// The lab chrome and sample fixtures ship in English only; "vi" switches the
// product preview to the Vietnamese product catalog.
export type LabLocale = "en" | "vi";
export const LOCALE_STORAGE_KEY = "multica-ui-lab:locale";
export function isLabLocale(value: unknown): value is LabLocale {
  return value === "en" || value === "vi";
}
export function loadLocale(): LabLocale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLabLocale(saved) ? saved : "en";
  } catch {
    return "en";
  }
}
export const productLocale = (locale: LabLocale) => locale;
