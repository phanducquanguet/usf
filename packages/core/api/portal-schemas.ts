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
    // A malformed partial must not discard the whole page — degrade to "".
    partial: z.string().optional().catch(undefined),
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

export const portalPublicProjectSchema = z
  .object({
    slug: z.string(),
    name: z.string(),
    description: z.string().optional(),
    industry: z.string().optional(),
    features: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    demo_url: z.string().optional(),
    portfolio_url: z.string().optional(),
  })
  .loose();

export const portalPublicProjectsSchema = z
  .object({ projects: z.array(portalPublicProjectSchema) })
  .loose();

export const portalAdminProjectSchema = portalPublicProjectSchema
  .extend({
    id: z.string(),
    source_url: z.string().optional(),
    published: z.boolean().optional(),
    sort_order: z.number().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .loose();

export const portalAdminProjectsSchema = z
  .object({ projects: z.array(portalAdminProjectSchema) })
  .loose();

export const EMPTY_PORTAL_PROJECTS = { projects: [] };

export const EMPTY_PORTAL_PUBLIC_CONFIG: PortalPublicConfig = { enabled: false };
export const EMPTY_PORTAL_MESSAGES_PAGE: PortalMessagesPage = {
  messages: [],
  pending: false,
  status: "active",
  partial: "",
};
export const EMPTY_PORTAL_ADMIN_CONFIG: PortalAdminConfig = { enabled: false };
