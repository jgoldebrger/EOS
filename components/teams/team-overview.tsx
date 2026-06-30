import Link from "next/link";
import { getTeamNavHref } from "@/components/layout/team-nav-config";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TeamOverviewProps {
  orgSlug: string;
  orgId: string;
  teamSlug: string;
  teamName: string;
}

export function TeamOverview({ orgSlug, teamSlug, teamName }: TeamOverviewProps) {
  const tabs = [
    { label: "Scorecards", segment: "scorecard", description: "Weekly metrics and KPIs" },
    { label: "Rocks", segment: "rocks", description: "Quarterly priorities" },
    { label: "Issues", segment: "issues", description: "IDS issue list" },
    { label: "To-Dos", segment: "todos", description: "7-day accountable tasks" },
    { label: "Agendas", segment: "agendas", description: "L10 and team meetings" },
    { label: "Headlines", segment: "headlines", description: "Customer & employee wins" },
    { label: "People", segment: "people", description: "Team members and roles" },
    { label: "Process", segment: "process", description: "SOPs and procedures" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Team overview</h2>
        <p className="text-sm text-muted-foreground">
          Quick access to {teamName} operating tools.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tabs.map((tab) => (
          <Link key={tab.segment} href={getTeamNavHref(orgSlug, teamSlug, tab.segment)}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{tab.label}</CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
