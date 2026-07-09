export interface PortalHeroContent {
  greeting?: string;
  headline?: string;
  subheadline?: string;
  contact_email?: string;
}

export interface PortalPublicConfig {
  enabled: boolean;
  hero_content?: PortalHeroContent;
  agent?: { name?: string };
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

export interface UpdatePortalAdminConfigRequest {
  enabled: boolean;
  agent_id?: string;
  hero_content?: PortalHeroContent;
}
