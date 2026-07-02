import type { ScorecardRollupRow } from "@/features/reports/types";

export function buildScorecardRollupCsv(rows: ScorecardRollupRow[]): string {
  const header = ["Team", "Metrics", "Green", "Yellow", "Red", "On-track %"];
  const lines = rows.map((row) => [
    row.teamName,
    String(row.metricCount),
    String(row.greenCount),
    String(row.yellowCount),
    String(row.redCount),
    String(row.onTrackPct),
  ]);
  return [header, ...lines].map((line) => line.join(",")).join("\n");
}
