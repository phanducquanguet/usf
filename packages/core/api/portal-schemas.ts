import { z } from "zod";
import type {
  PortalAdminConfig,
  PortalMessagesPage,
  PortalPublicConfig,
} from "../types/portal";

export const portalHeroContentSchema = z
  .object({
    greeting: z.string().optional(),
    headline: z.string().optional(),
    subheadline: z.string().optional(),
    contact_email: z.string().optional(),
  })
  .loose();

export const portalPublicConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    hero_content: portalHeroContentSchema.optional(),
    agent: z.object({ name: z.string().optional() }).loose().optional(),
  })
  .loose();

export const portalGuestSessionSchema = z.object({ token: z.string() }).loose();

export const portalChatMessageSchema = z
  .object({
    id: z.string(),
    role: z.string(),
    content: z.string(),
    created_at: z.string(),
  })
  .loose();

export const portalMessagesPageSchema = z
  .object({
    messages: z.array(portalChatMessageSchema).optional(),
    pending: z.boolean().optional(),
    status: z.string().optional(),
  })
  .loose();

export const portalSendMessageResponseSchema = z
  .object({ message: portalChatMessageSchema.optional() })
  .loose();

export const portalAdminConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    agent_id: z.string().optional(),
    service_user_id: z.string().optional(),
    hero_content: portalHeroContentSchema.optional(),
  })
  .loose();

export const EMPTY_PORTAL_PUBLIC_CONFIG: PortalPublicConfig = { enabled: false };
export const EMPTY_PORTAL_MESSAGES_PAGE: PortalMessagesPage = {
  messages: [],
  pending: false,
  status: "active",
};
export const EMPTY_PORTAL_ADMIN_CONFIG: PortalAdminConfig = { enabled: false };
