/** Locale-specific hero copy. Missing fields fall back to the built-in
 * portal translations for that locale. */
export interface PortalHeroCopy {
  greeting?: string;
  headline?: string;
  subheadline?: string;
}

/** Admin-authored landing content, keyed by locale so the language switch
 * also switches custom copy (migration 163 moved legacy flat fields under
 * `vi`). contact_email is language-neutral. */
export interface PortalHeroContent {
  contact_email?: string;
  vi?: PortalHeroCopy;
  en?: PortalHeroCopy;
}

export interface PortalPublicConfig {
  enabled: boolean;
  hero_content?: PortalHeroContent;
  agent?: { name?: string; avatar_url?: string };
}

export interface PortalGuestSession {
  token: string;
}

export interface PortalChatMessage {
  id: string;
  role: string; // "user" | "assistant" — keep open for drift
  content: string;
  created_at: string;
}

export interface PortalMessagesPage {
  messages: PortalChatMessage[];
  pending: boolean;
  status: string; // "active" | "confirmed" | "closed" — keep open for drift
  /**
   * Streamed text of the in-flight assistant reply, concatenated server-side
   * from the running task's text fragments. Empty when nothing is pending or
   * the server predates the field.
   */
  partial: string;
}

export interface PortalContact {
  name: string;
  email: string;
  phone?: string;
}

export interface PortalAdminConfig {
  enabled: boolean;
  agent_id?: string;
  service_user_id?: string;
  hero_content?: PortalHeroContent;
}

/** Per-field locale overrides for a marketplace project. Base columns hold
 * the Vietnamese copy; missing fields fall back to it (hero_content pattern,
 * migration 164). */
export interface PortalProjectCopy {
  name?: string;
  description?: string;
  industry?: string;
  features?: string[];
}

export interface PortalProjectI18n {
  en?: PortalProjectCopy;
}

export interface PortalProject {
  slug: string;
  name: string;
  description: string;
  industry: string;
  features: string[];
  images: string[];
  demo_url: string;
  portfolio_url: string;
  i18n?: PortalProjectI18n;
}

export interface PortalAdminProject extends PortalProject {
  id: string;
  source_url: string;
  published: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortalProjectInput {
  name: string;
  description: string;
  industry: string;
  features: string[];
  images: string[];
  demo_url: string;
  portfolio_url: string;
  source_url: string;
  published: boolean;
  sort_order: number;
  i18n?: PortalProjectI18n;
}

export interface UpdatePortalAdminConfigRequest {
  enabled: boolean;
  agent_id?: string;
  hero_content?: PortalHeroContent;
}
