export type CoreValueRating = "+" | "+/-" | "-";
export type RprsStatus = "green" | "yellow" | "red";

export function parseCoreValuesFromVto(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function isRightSeat(getIt: number, wantIt: number, capacity: number): boolean {
  return getIt >= 4 && wantIt >= 4 && capacity >= 4;
}

export function isRightPerson(
  coreValueNames: string[],
  scores: Record<string, CoreValueRating>,
): boolean {
  if (coreValueNames.length === 0) {
    return true;
  }
  return coreValueNames.every((name) => scores[name] === "+");
}

export function computeRprsStatus(input: {
  getIt: number;
  wantIt: number;
  capacity: number;
  coreValueNames: string[];
  coreValuesScores: Record<string, CoreValueRating>;
}): RprsStatus {
  const rightSeat = isRightSeat(input.getIt, input.wantIt, input.capacity);
  const rightPerson = isRightPerson(input.coreValueNames, input.coreValuesScores);

  if (rightPerson && rightSeat) {
    return "green";
  }
  if (rightPerson || rightSeat) {
    return "yellow";
  }
  return "red";
}

export const RPRS_STATUS_LABELS: Record<RprsStatus, string> = {
  green: "Right Person, Right Seat",
  yellow: "Needs attention",
  red: "Action required",
};
