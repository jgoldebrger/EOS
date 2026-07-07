import { describe, expect, it } from "vitest";
import { formatQuarterLabel, getCurrentQuarter } from "@/features/rocks/utils";

describe("quarterly pulse helpers", () => {
  it("formats current quarter label", () => {
    const quarter = getCurrentQuarter(new Date("2026-07-15"));
    expect(quarter).toBe("2026-Q3");
    expect(formatQuarterLabel(quarter)).toBe("Q3 2026");
  });
});
