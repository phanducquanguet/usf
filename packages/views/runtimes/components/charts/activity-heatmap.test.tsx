import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { RuntimeUsage } from "@multica/core/types";
import { renderWithI18n } from "../../../test/i18n";
import viRuntimes from "../../../locales/vi/runtimes.json";

vi.mock("@multica/core/runtimes/custom-pricing-store", () => {
  const pricingState = { pricings: {} };
  const useCustomPricingStore = Object.assign(
    (selector?: (state: typeof pricingState) => unknown) =>
      selector ? selector(pricingState) : pricingState,
    { getState: () => pricingState },
  );

  return {
    useCustomPricingStore,
    getCustomPricing: () => undefined,
  };
});

import { ActivityHeatmap } from "./activity-heatmap";

function usageOn(date: string, ticks: number): RuntimeUsage {
  return {
    runtime_id: "runtime-1",
    date,
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    input_tokens: 1_000,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    cost_usd_ticks: ticks,
    uncosted_input_tokens: 0,
    uncosted_output_tokens: 0,
    uncosted_cache_read_tokens: 0,
    uncosted_cache_write_tokens: 0,
  };
}

// Spend on a Wednesday and a Monday only, so the window has a busiest
// weekday (Wed) and a quietest one (Tue) that are distinct from each other
// and from the Mon/Wed/Fri row labels.
const USAGE: RuntimeUsage[] = [
  usageOn("2026-08-12", 20_000_000_000),
  usageOn("2026-08-03", 5_000_000_000),
];

// Read one stat cell's value by its label. Asserting on the value node (not
// on "does this string appear anywhere") matters here: the Mon/Wed/Fri row
// labels render the same weekday names, so a document-wide text match would
// pass even if the weekday insight fell back to English or picked the wrong
// day.
function statValue(label: string): string {
  const cell = screen.getByText(label).closest("div");
  return cell?.querySelector("dd")?.textContent ?? "";
}

describe("ActivityHeatmap localization", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-12T12:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renders chart chrome, dates, and tooltips in the selected locale", () => {
    const { container } = renderWithI18n(
      <ActivityHeatmap usage={USAGE} tz="Asia/Shanghai" />,
      { locale: "vi" },
    );

    const charts = viRuntimes.charts;
    // Dates and weekday names are Intl output for "vi".
    expect(statValue(charts.heatmap_busiest_day)).toContain("12 thg 8");
    expect(statValue(charts.heatmap_most_active_weekday)).toContain("Thứ 4");
    expect(statValue(charts.heatmap_quietest_weekday)).toContain("Thứ 3");
    expect(screen.getByText(new RegExp(`^${charts.heatmap_window_total_other.replace("{{count}}", "\\d+")}$`))).toBeTruthy();
    expect(screen.queryByText("Busiest day")).toBeNull();

    // Row labels: Monday-first, only alternating rows are labelled.
    const rowLabels = Array.from(
      container.querySelectorAll("svg text"),
      (node) => node.textContent,
    );
    expect(rowLabels).toEqual(expect.arrayContaining(["Thứ 2", "Thứ 4", "Thứ 6"]));
    expect(rowLabels).not.toContain("Thứ 3");

    const titles = Array.from(container.querySelectorAll("title"), (title) =>
      title.textContent?.trim(),
    );
    expect(titles.some((title) => title?.endsWith(`: ${charts.heatmap_no_activity}`))).toBe(true);
  });
});
