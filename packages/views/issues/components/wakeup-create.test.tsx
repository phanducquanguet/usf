import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@multica/core/api";
import { configureShortcutPlatform } from "@multica/core/shortcuts";
import { renderWithI18n } from "../../test/i18n";
import viIssues from "../../locales/vi/issues.json";
import { WakeupCreate } from "./wakeup-create";

const create = vi.fn();
let assigneeAgent = "emacs";
const c = viIssues.wakeups.create;
const instruction = viIssues.wakeups.instruction_title;
const re = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
vi.mock("./wakeup-condition-names", () => ({
  useConditionNames: () => ({ status: (key: string) => key, label: () => undefined, property: () => undefined, actor: (_type: string, id: string) => id }),
}));
vi.mock("@multica/core/issues", () => ({
  useCreateIssueWakeup: () => ({ mutateAsync: create, isPending: false }),
  childIssuesOptions: () => ({ queryKey: ["children"] }),
  issueDetailOptions: () => ({ queryKey: ["issue-detail"] }),
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQuery: ({ queryKey }: { queryKey: unknown[] }) => ({
    data: JSON.stringify(queryKey).includes("members")
      ? [{ user_id: "user-j", name: "Jiayuan" }]
      : JSON.stringify(queryKey).includes("issue-detail")
        ? { id: "issue", assignee_type: "agent", assignee_id: assigneeAgent }
        : [
          { id: "emacs", name: "Emacs", archived_at: null, runtime_id: "rt" },
          { id: "grok", name: "Grok", archived_at: null, runtime_id: "rt" },
        ],
  }),
}));
vi.mock("@multica/core/agents", () => ({ isAgentRuntimeBound: () => true }));
vi.mock("../../common/actor-avatar", () => ({ ActorAvatar: () => <span /> }));
vi.mock("../../common/use-viewing-timezone", () => ({ useViewingTimezone: () => "Asia/Shanghai" }));

async function renderForm(defaultAgentId = "emacs") {
  renderWithI18n(<WakeupCreate workspaceId="ws" issueId="issue" defaultAgentId={defaultAgentId} />, { locale: "vi" });
  fireEvent.click(screen.getByRole("button", { name: c.open }));
  await screen.findByRole("form", { name: c.title });
}

async function chooseCondition(label: string) {
  fireEvent.click(screen.getByRole("button", { name: re(c.choose_condition) }));
  fireEvent.click(await screen.findByRole("menuitem", { name: re(label) }));
}

beforeEach(() => {
  assigneeAgent = "emacs";
  create.mockReset().mockResolvedValue(undefined);
  // The send shortcut is the primary modifier + Enter; pin the platform so
  // Cmd means primary on every CI runner.
  configureShortcutPlatform("macos");
});
afterEach(() => configureShortcutPlatform(null));

describe("WakeupCreateForm", () => {
  it("says a reply wait for the assignee joins the run a comment already starts", async () => {
    await renderForm();
    await chooseCondition(c.cond_reply);
    expect(screen.getByText(c.assignee_comment_hint.replace("{{name}}", "Emacs"))).toBeVisible();
  });

  it("says nothing when the rule wakes someone other than the assignee", async () => {
    assigneeAgent = "grok";
    await renderForm();
    await chooseCondition(c.cond_reply);
    expect(screen.queryByText(re(c.assignee_comment_hint.split("{{name}}")[1]!))).toBeNull();
  });

  it("asks for a condition before creating anything", async () => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.missing_condition);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a reply wait for the assignee with a deadline and timeout action", async () => {
    await renderForm();
    await chooseCondition(c.cond_reply);
    expect(screen.getByRole("radiogroup", { name: c.trigger_count })).toBeVisible();
    expect(screen.getByRole("button", { name: re(`${c.max_wait}: ${c.wait_days_other.replace("{{count}}", "7")}`) })).toBeVisible();
    expect(screen.getByRole("button", { name: re(`${c.on_timeout}: ${c.timeout_wake.replace("{{agent}}", "Emacs")}`) })).toBeVisible();
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "按回复继续实现阶段 2" } });
    fireEvent.click(screen.getByRole("radio", { name: viIssues.wakeups.continuous }));
    // A repeating wait gets a cap on how many runs it may start.
    expect(screen.getByRole("button", { name: re(`${c.max_fires}: ${c.max_fires_times_other.replace("{{count}}", "20")}`) })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        agent_id: "emacs",
        instruction: "按回复继续实现阶段 2",
        kind: "event",
        mode: "continuous",
        max_fires: 20,
        event_types: ["comment.created"],
        expires_in_seconds: 604800,
        on_timeout: "wake",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("form", { name: c.title })).toBeNull());
  });

  it("requires an agent when the issue has no agent assignee", async () => {
    await renderForm("");
    await chooseCondition(c.cond_at);
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "看一下 CI" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.missing_agent);
  });

  it("gives a recurring check an end date and no timeout choice", async () => {
    await renderForm();
    await chooseCondition(c.cond_recurring);
    expect(screen.getByLabelText(c.until)).toBeVisible();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "巡检迁移任务" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: "cron", cron_expression: "0 9 * * *", timezone: "Asia/Shanghai", mode: "continuous" })),
    );
  });

  it("keeps the draft and explains a capacity refusal", async () => {
    create.mockRejectedValue(new ApiError("full", 400, "Bad Request", { code: "wakeup_capacity_exceeded" }));
    await renderForm();
    await chooseCondition(c.cond_at);
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "看一下 CI" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    expect(await screen.findByRole("alert")).toHaveTextContent(c.capacity_error);
    expect(screen.getByLabelText(instruction)).toHaveValue("看一下 CI");
    expect(screen.getByRole("form", { name: c.title })).toBeVisible();
  });

  it("submits with Cmd+Enter", async () => {
    await renderForm();
    await chooseCondition(c.cond_at);
    const input = screen.getByLabelText(instruction);
    fireEvent.change(input, { target: { value: "看一下 CI" } });
    fireEvent.keyDown(input, { key: "Enter", metaKey: true });
    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({ kind: "at", mode: "once" })));
  });
});

describe("platform conditions in the form", () => {
  it("groups conditions by what they wait for", async () => {
    await renderForm();
    fireEvent.click(screen.getByRole("button", { name: re(c.choose_condition) }));
    for (const label of [c.cond_field, c.cond_children, c.cond_pr, c.cond_issue]) {
      expect(await screen.findByRole("menuitem", { name: re(label) })).toBeVisible();
    }
    for (const group of [c.group_collaboration, c.group_runs, c.group_linked]) expect(screen.getByText(group)).toBeVisible();
  });

  it("creates a sub-issue wait that the platform checks", async () => {
    await renderForm();
    await chooseCondition(c.cond_children);
    expect(screen.getByRole("button", { name: re(`${c.cond_children}: ${c.children_all}`) })).toBeVisible();
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "汇总子任务结果" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "event", mode: "once", condition: { type: "children_done" }, expires_in_seconds: 604800 }),
      ),
    );
    expect(create.mock.calls[0]![0]).not.toHaveProperty("event_types");
  });

  it("waits for a linked PR's CI by default and can wait for the merge instead", async () => {
    await renderForm();
    await chooseCondition(c.cond_pr);
    fireEvent.click(screen.getByRole("button", { name: re(`${c.cond_pr}: ${c.pr_checks}`) }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: c.pr_merged }));
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "发布" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(expect.objectContaining({ condition: { type: "pull_request", event: "merged" } })),
    );
  });

  it("asks for the value a field has to reach", async () => {
    await renderForm();
    await chooseCondition(c.cond_field);
    fireEvent.change(screen.getByLabelText(instruction), { target: { value: "继续" } });
    fireEvent.click(screen.getByRole("button", { name: re(c.submit) }));
    expect(screen.getByRole("alert")).toHaveTextContent(c.missing_value);
    expect(create).not.toHaveBeenCalled();
  });
});
