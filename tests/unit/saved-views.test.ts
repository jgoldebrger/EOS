import { describe, expect, it } from "vitest";
import {
  scorecardFiltersFromSearchParams,
  scorecardFiltersMatch,
  scorecardFiltersToSearchParams,
  type ScorecardViewFilters,
} from "@/features/scorecard/saved-views";

const sampleFilters: ScorecardViewFilters = {
  period: "monthly",
  groupBy: "team",
  state: "active",
  category: "cat-1",
  range: "26",
  q: "revenue",
};

describe("scorecardFiltersToSearchParams", () => {
  it("serializes filters to URL params", () => {
    const params = scorecardFiltersToSearchParams(sampleFilters);
    expect(params.get("period")).toBe("monthly");
    expect(params.get("groupBy")).toBe("team");
    expect(params.get("category")).toBe("cat-1");
    expect(params.get("q")).toBe("revenue");
  });

  it("omits category and q when empty or all", () => {
    const params = scorecardFiltersToSearchParams({
      ...sampleFilters,
      category: "all",
      q: "",
    });
    expect(params.get("category")).toBeNull();
    expect(params.get("q")).toBeNull();
  });
});

describe("scorecardFiltersFromSearchParams", () => {
  it("reads defaults from empty params", () => {
    const filters = scorecardFiltersFromSearchParams(new URLSearchParams());
    expect(filters.period).toBe("weekly");
    expect(filters.groupBy).toBe("owner");
    expect(filters.state).toBe("active");
    expect(filters.category).toBe("all");
    expect(filters.range).toBe("13");
  });
});

describe("scorecardFiltersMatch", () => {
  it("returns true when filters are equal", () => {
    expect(scorecardFiltersMatch(sampleFilters, { ...sampleFilters })).toBe(true);
  });

  it("returns false when a field differs", () => {
    expect(
      scorecardFiltersMatch(sampleFilters, { ...sampleFilters, period: "weekly" }),
    ).toBe(false);
  });
});
