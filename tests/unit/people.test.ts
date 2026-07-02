import { describe, expect, it } from "vitest";
import {
  computeRprsStatus,
  isRightPerson,
  isRightSeat,
  parseCoreValuesFromVto,
} from "@/features/people/utils";

describe("people analyzer utils", () => {
  it("parses core values from VTO content", () => {
    const values = parseCoreValuesFromVto("Integrity\nDo the right thing\n\nRespect");
    expect(values).toEqual(["Integrity", "Do the right thing", "Respect"]);
  });

  it("detects right seat when GWC all at least 4", () => {
    expect(isRightSeat(4, 4, 4)).toBe(true);
    expect(isRightSeat(3, 4, 4)).toBe(false);
  });

  it("detects right person when all values are plus", () => {
    expect(
      isRightPerson(["Integrity", "Respect"], {
        Integrity: "+",
        Respect: "+",
      }),
    ).toBe(true);
    expect(
      isRightPerson(["Integrity"], {
        Integrity: "+/-",
      }),
    ).toBe(false);
  });

  it("computes RPRS status", () => {
    expect(
      computeRprsStatus({
        getIt: 4,
        wantIt: 4,
        capacity: 4,
        coreValueNames: ["Integrity"],
        coreValuesScores: { Integrity: "+" },
      }),
    ).toBe("green");
    expect(
      computeRprsStatus({
        getIt: 4,
        wantIt: 4,
        capacity: 4,
        coreValueNames: ["Integrity"],
        coreValuesScores: { Integrity: "-" },
      }),
    ).toBe("yellow");
    expect(
      computeRprsStatus({
        getIt: 2,
        wantIt: 2,
        capacity: 2,
        coreValueNames: ["Integrity"],
        coreValuesScores: { Integrity: "-" },
      }),
    ).toBe("red");
  });
});
