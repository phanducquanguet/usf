import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { TimelineEntry } from "@multica/core/types";
import { I18nProvider } from "@multica/core/i18n/react";
import { RESOURCES } from "../../test/i18n";
import viIssues from "../../locales/vi/issues.json";
import { useT } from "../../i18n";
import { useWakeupText } from "./wakeup-presentation";
import { formatWakeupActivity, wakeupActivityChip } from "./wakeup-activity";

vi.mock("./wakeup-condition-names", () => ({
  useConditionNames: () => ({ status: (key: string) => key, label: () => undefined, property: () => undefined, actor: (_type: string, id: string) => id }),
}));
vi.mock("../../common/use-viewing-timezone", () => ({ useViewingTimezone: () => "UTC" }));

const names: Record<string, string> = { a: "Emacs", u: "Jiayuan", g: "Grok" };
const getActorName = (_type: string, id: string) => names[id] ?? id;
const entry = (action: string, details: Record<string, unknown>, patch: Partial<TimelineEntry> = {}): TimelineEntry =>
  ({ type: "activity", id: action, actor_type: "system", actor_id: "", action, details, created_at: "2026-09-24T00:00:00Z", ...patch }) as TimelineEntry;
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k]));
const a = viIssues.activity;
const replyCondition = fill(viIssues.wakeups.by_actor, { condition: viIssues.wakeups.conditions.comment_created, agent: "Jiayuan" });
const reply = { id: "w", kind: "event", mode: "once", event_types: ["comment.created"], agent_id: "a", filter_actor_type: "member", filter_actor_id: "u", created_by: "u" };

function helpers() {
  const { result } = renderHook(() => ({ t: useT("issues").t, text: useWakeupText() }), {
    wrapper: ({ children }) => (
      <I18nProvider locale="vi" resources={RESOURCES}>
        {children}
      </I18nProvider>
    ),
  });
  return result.current;
}

describe("wakeup timeline entries", () => {
  it("reads each entry as one sentence", () => {
    const { t, text } = helpers();
    const read = (e: TimelineEntry) => formatWakeupActivity(e, t, text, getActorName);
    expect(read(entry("wakeup_created", { wakeup: reply }, { actor_type: "agent", actor_id: "a" }))).toBe(
      fill(a.wakeup_created, { condition: replyCondition, agent: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { wakeup: { ...reply, condition: { type: "pull_request", event: "checks_finished" } } }))).toBe(
      fill(a.wakeup_triggered, { condition: viIssues.wakeups.cond.pr_checks, agent: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { wakeup: reply, events: ["wakeup.manual"], actor_type: "member", actor_id: "u" }))).toBe(
      fill(a.wakeup_triggered_manual, { name: "Jiayuan", agent: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { rule: "child_done", stage: 1, total: 2, target_type: "agent", target_id: "a", outcome: "woke" }))).toBe(
      fill(a.wakeup_child_done_stage_other, { stage: 1, count: 2 }) + fill(a.wakeup_child_done_woke, { name: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { rule: "child_done", total: 3, target_type: "member", target_id: "u", outcome: "notified" }))).toBe(
      fill(a.wakeup_child_done_all_other, { count: 3 }) + fill(a.wakeup_child_done_notified, { name: "Jiayuan" }),
    );
    expect(read(entry("wakeup_triggered", { rule: "child_done", total: 3, target_type: "agent", target_id: "a", outcome: "merged" }))).toBe(
      fill(a.wakeup_child_done_all_other, { count: 3 }) + fill(a.wakeup_child_done_merged, { name: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { rule: "child_done", stage: 2, total: 1, outcome: "none" }))).toBe(
      fill(a.wakeup_child_done_stage_other, { stage: 2, count: 1 }),
    );
    expect(read(entry("wakeup_triggered", { rule: "child_done", stage: 1, total: 2, target_type: "agent", target_id: "a", outcome: "acknowledged" }))).toBe(
      fill(a.wakeup_child_done_stage_other, { stage: 1, count: 2 }) + fill(a.wakeup_child_done_acknowledged, { name: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { wakeup: reply, outcome: "merged" }))).toBe(
      fill(a.wakeup_triggered_merged, { condition: replyCondition, agent: "Emacs" }),
    );
    expect(read(entry("wakeup_triggered", { wakeup: reply, outcome: "acknowledged" }))).toBe(
      fill(a.wakeup_triggered_acknowledged, { condition: replyCondition, agent: "Emacs" }),
    );
    expect(read(entry("wakeup_timed_out", { wakeup: reply, woke: true }))).toBe(
      fill(a.wakeup_timed_out_wake, { condition: replyCondition, agent: "Emacs" }),
    );
    expect(read(entry("wakeup_paused", { wakeup: reply, reason: "loop" }))).toBe(viIssues.wakeups.paused.loop);
    expect(read(entry("wakeup_checkin", { wakeup: reply, note: "进度 72%" }, { actor_type: "agent", actor_id: "g", coalesced_count: 3 }))).toBe(
      fill(a.wakeup_checkin_coalesced_other, { count: 3, note: "进度 72%" }),
    );
  });

  it("tags an entry with the rule it came from", () => {
    const { t, text } = helpers();
    const chip = (e: TimelineEntry) => wakeupActivityChip(e, t, text, getActorName);
    expect(chip(entry("wakeup_triggered", { rule: "child_done" }))).toBe(a.wakeup_chip_system);
    expect(chip(entry("wakeup_triggered", { wakeup: reply }))).toBe(fill(a.wakeup_chip_created_by, { name: "Jiayuan" }));
    expect(chip(entry("wakeup_triggered", { wakeup: { ...reply, created_by_agent_id: "a" } }))).toBe(fill(a.wakeup_chip_created_by, { name: "Emacs" }));
    expect(chip(entry("wakeup_created", { wakeup: reply }))).toBeNull();
  });

});
