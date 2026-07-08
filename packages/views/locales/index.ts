import type { LocaleResources, SupportedLocale } from "@multica/core/i18n";
import enCommon from "./en/common.json";
import enAuth from "./en/auth.json";
import enSettings from "./en/settings.json";
import enIssues from "./en/issues.json";
import enAgents from "./en/agents.json";
import enEditor from "./en/editor.json";
import enOnboarding from "./en/onboarding.json";
import enInvite from "./en/invite.json";
import enLabels from "./en/labels.json";
import enMembers from "./en/members.json";
import enMyIssues from "./en/my-issues.json";
import enSearch from "./en/search.json";
import enInbox from "./en/inbox.json";
import enWorkspace from "./en/workspace.json";
import enProjects from "./en/projects.json";
import enAutopilots from "./en/autopilots.json";
import enSkills from "./en/skills.json";
import enChat from "./en/chat.json";
import enModals from "./en/modals.json";
import enRuntimes from "./en/runtimes.json";
import enLayout from "./en/layout.json";
import enUsage from "./en/usage.json";
import enUi from "./en/ui.json";
import enSquads from "./en/squads.json";
import enBilling from "./en/billing.json";
import viCommon from "./vi/common.json";
import viAuth from "./vi/auth.json";
import viSettings from "./vi/settings.json";
import viIssues from "./vi/issues.json";
import viAgents from "./vi/agents.json";
import viEditor from "./vi/editor.json";
import viOnboarding from "./vi/onboarding.json";
import viInvite from "./vi/invite.json";
import viLabels from "./vi/labels.json";
import viMembers from "./vi/members.json";
import viMyIssues from "./vi/my-issues.json";
import viSearch from "./vi/search.json";
import viInbox from "./vi/inbox.json";
import viWorkspace from "./vi/workspace.json";
import viProjects from "./vi/projects.json";
import viAutopilots from "./vi/autopilots.json";
import viSkills from "./vi/skills.json";
import viChat from "./vi/chat.json";
import viModals from "./vi/modals.json";
import viRuntimes from "./vi/runtimes.json";
import viLayout from "./vi/layout.json";
import viUsage from "./vi/usage.json";
import viUi from "./vi/ui.json";
import viSquads from "./vi/squads.json";
import viBilling from "./vi/billing.json";

// Single source of truth for the resource bundle. Both apps (web layout +
// desktop App.tsx) import from here so adding a locale or namespace happens
// in exactly one place.
export const RESOURCES: Record<SupportedLocale, LocaleResources> = {
  en: {
    common: enCommon,
    auth: enAuth,
    settings: enSettings,
    issues: enIssues,
    agents: enAgents,
    editor: enEditor,
    onboarding: enOnboarding,
    invite: enInvite,
    labels: enLabels,
    members: enMembers,
    "my-issues": enMyIssues,
    search: enSearch,
    inbox: enInbox,
    workspace: enWorkspace,
    projects: enProjects,
    autopilots: enAutopilots,
    skills: enSkills,
    chat: enChat,
    modals: enModals,
    runtimes: enRuntimes,
    layout: enLayout,
    usage: enUsage,
    ui: enUi,
    squads: enSquads,
    billing: enBilling,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
    settings: viSettings,
    issues: viIssues,
    agents: viAgents,
    editor: viEditor,
    onboarding: viOnboarding,
    invite: viInvite,
    labels: viLabels,
    members: viMembers,
    "my-issues": viMyIssues,
    search: viSearch,
    inbox: viInbox,
    workspace: viWorkspace,
    projects: viProjects,
    autopilots: viAutopilots,
    skills: viSkills,
    chat: viChat,
    modals: viModals,
    runtimes: viRuntimes,
    layout: viLayout,
    usage: viUsage,
    ui: viUi,
    squads: viSquads,
    billing: viBilling,
  },
};
