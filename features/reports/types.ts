export interface ScorecardRollupRow {
  teamId: string | null;
  teamName: string;
  metricCount: number;
  greenCount: number;
  yellowCount: number;
  redCount: number;
  onTrackPct: number;
}

export interface L10RatingTrendPoint {
  teamId: string;
  teamName: string;
  meetingDate: string;
  avgRating: number;
}

export interface RockCompletionByTeam {
  teamId: string | null;
  teamName: string;
  total: number;
  done: number;
  completionPct: number;
}

export interface IdsThroughput {
  opened: number;
  solved: number;
  solveRatePct: number;
}

export interface RprsDistribution {
  green: number;
  yellow: number;
  red: number;
  total: number;
}

export interface CascadeCompletionMetric {
  total: number;
  acknowledged: number;
  completionPct: number;
}

export interface ExecutiveReportsData {
  quarter: string;
  scorecardRollup: ScorecardRollupRow[];
  l10RatingTrend: L10RatingTrendPoint[];
  rockCompletionByTeam: RockCompletionByTeam[];
  idsThroughput: IdsThroughput;
  rprsDistribution: RprsDistribution;
  cascadeCompletion: CascadeCompletionMetric;
}
