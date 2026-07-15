import type { PortalProject } from "../types/portal";
import type { SupportedLocale } from "./types";

/** Returns the project with its copy fields swapped to the active locale.
 * Base fields hold the Vietnamese copy; `i18n.en` carries per-field English
 * overrides, each falling back to the base so a partial translation never
 * yields blank UI (same contract as hero_content). */
export function localizePortalProject<T extends PortalProject>(
  project: T,
  locale: SupportedLocale,
): T {
  if (locale !== "en") return project;
  const copy = project.i18n?.en;
  if (!copy) return project;
  return {
    ...project,
    name: copy.name || project.name,
    description: copy.description || project.description,
    industry: copy.industry || project.industry,
    features: copy.features && copy.features.length > 0 ? copy.features : project.features,
  };
}
