import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed } from "lucide-react";
import type { QuarterlyPulseData } from "@/features/quarterly/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QuarterlyPulseWorkspaceProps {
  data: QuarterlyPulseData;
}

function statusIcon(status: QuarterlyPulseData["steps"][number]["status"]) {
  if (status === "complete") {
    return <CheckCircle2 className="h-5 w-5 text-green-600" aria-hidden />;
  }
  if (status === "in_progress") {
    return <Circle className="h-5 w-5 text-amber-500" aria-hidden />;
  }
  return <CircleDashed className="h-5 w-5 text-muted-foreground" aria-hidden />;
}

function statusLabel(status: QuarterlyPulseData["steps"][number]["status"]) {
  if (status === "complete") return "Complete";
  if (status === "in_progress") return "In progress";
  return "Not started";
}

export function QuarterlyPulseWorkspace({ data }: QuarterlyPulseWorkspaceProps) {
  const completedCount = data.steps.filter((step) => step.status === "complete").length;

  return (
    <div className="space-y-6" data-testid="quarterly-pulse-workspace">
      <Card>
        <CardHeader>
          <CardTitle>{data.quarterLabel} quarterly pulse</CardTitle>
          <CardDescription>
            Guided EOS quarterly workflow — review V/TO, company rocks, and People Analyzer before
            planning the next 90 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
            {completedCount}/{data.steps.length} steps complete
          </Badge>
          <Badge variant="outline">
            {data.summary.companyRocksOnTrack}/{data.summary.companyRocksTotal} company rocks on
            track
          </Badge>
          <Badge variant="outline">
            {data.summary.peopleReviewed}/{data.summary.peopleTotal} people reviewed
          </Badge>
        </CardContent>
      </Card>

      <ol className="space-y-3">
        {data.steps.map((step, index) => (
          <li key={step.key}>
            <Card>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="flex min-w-0 gap-3">
                  {statusIcon(step.status)}
                  <div className="space-y-1">
                    <p className="font-medium">
                      {index + 1}. {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                    <p className="text-xs text-muted-foreground">{step.detail}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      step.status === "complete" && "border-green-600/40 text-green-700",
                      step.status === "in_progress" && "border-amber-500/40 text-amber-700",
                    )}
                  >
                    {statusLabel(step.status)}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={step.href}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
