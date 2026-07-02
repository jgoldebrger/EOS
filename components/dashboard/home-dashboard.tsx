import Link from "next/link";
import type { HomeDashboardData } from "@/features/dashboard/queries";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface HomeDashboardProps {
  orgSlug: string;
  data: HomeDashboardData;
}

export function HomeDashboard({ orgSlug, data }: HomeDashboardProps) {
  const base = `/org/${orgSlug}`;

  return (
    <div className="space-y-8" data-testid="home-dashboard">
      <DashboardSummaryCards orgSlug={orgSlug} summary={data.summary} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="mb-2 font-medium">Overdue to-dos</p>
              {data.overdueTodos.length === 0 ? (
                <p className="text-muted-foreground">None overdue.</p>
              ) : (
                <ul className="space-y-1">
                  {data.overdueTodos.map((todo) => (
                    <li key={todo.id}>{todo.title}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium">Off-track rocks</p>
              {data.offTrackRocks.length === 0 ? (
                <p className="text-muted-foreground">All rocks on track.</p>
              ) : (
                <ul className="space-y-1">
                  {data.offTrackRocks.map((rock) => (
                    <li key={rock.id}>{rock.title}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="mb-2 font-medium">Assigned issues</p>
              {data.assignedIssues.length === 0 ? (
                <p className="text-muted-foreground">No open assigned issues.</p>
              ) : (
                <ul className="space-y-1">
                  {data.assignedIssues.map((issue) => (
                    <li key={issue.id}>{issue.title}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Company snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <p>Rock completion: {data.companySnapshot.rockCompletionPct}%</p>
            <p>Issues solved (7d): {data.companySnapshot.issuesSolvedThisWeek}</p>
            <p>Open issues: {data.companySnapshot.openIssues}</p>
            <p>Open to-dos: {data.companySnapshot.openTodos}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team pulse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Team</th>
                  <th className="pb-2 pr-4 font-medium">Rock %</th>
                  <th className="pb-2 pr-4 font-medium">Open issues</th>
                  <th className="pb-2 font-medium">Last L10</th>
                </tr>
              </thead>
              <tbody>
                {data.teamPulse.map((team) => (
                  <tr key={team.teamId} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Link
                        href={`${base}/teams/${team.teamSlug}/overview`}
                        className="hover:underline"
                      >
                        {team.teamName}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{team.rockCompletionPct}%</td>
                    <td className="py-2 pr-4 tabular-nums">{team.openIssues}</td>
                    <td className="py-2 tabular-nums">
                      {team.lastL10Rating != null ? `${team.lastL10Rating}/10` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/vto`}>V/TO</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/people/analyzer`}>People Analyzer</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`${base}/teams`}>Teams & L10</Link>
        </Button>
      </div>
    </div>
  );
}
