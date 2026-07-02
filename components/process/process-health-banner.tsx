import type { ProcessHealthMetrics } from "@/features/process/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProcessHealthBannerProps {
  metrics: ProcessHealthMetrics;
}

export function ProcessHealthBanner({ metrics }: ProcessHealthBannerProps) {
  return (
    <Card className="mb-6" data-testid="process-health-banner">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Process health</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
        <p>
          Seats with SOPs:{" "}
          <span className="font-semibold tabular-nums">{metrics.documentedPct}%</span>
          <span className="text-muted-foreground">
            {" "}
            ({metrics.seatsWithSop}/{metrics.totalSeats})
          </span>
        </p>
        <p>
          Stale SOPs (90d+):{" "}
          <span className="font-semibold tabular-nums">{metrics.staleSopCount}</span>
        </p>
        <p className="text-muted-foreground">
          Link SOPs to accountability seats for EOS coverage.
        </p>
      </CardContent>
    </Card>
  );
}
