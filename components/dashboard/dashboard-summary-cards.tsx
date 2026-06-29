import Link from "next/link";
import {
  BarChart3,
  CheckSquare,
  ListTodo,
  Mountain,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSummary } from "@/features/dashboard/queries";

interface DashboardSummaryCardsProps {
  orgSlug: string;
  summary: DashboardSummary;
}

interface SummaryCard {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  testId: string;
}

export function DashboardSummaryCards({
  orgSlug,
  summary,
}: DashboardSummaryCardsProps) {
  const base = `/org/${orgSlug}`;

  const cards: SummaryCard[] = [
    {
      title: "Scorecard",
      description: "Active metrics",
      count: summary.metricsCount,
      href: `${base}/scorecard`,
      icon: BarChart3,
      testId: "dashboard-card-scorecard",
    },
    {
      title: "Rocks",
      description: "Active quarterly rocks",
      count: summary.openRocksCount,
      href: `${base}/rocks`,
      icon: Mountain,
      testId: "dashboard-card-rocks",
    },
    {
      title: "Issues",
      description: "Open issues",
      count: summary.openIssuesCount,
      href: `${base}/issues`,
      icon: ListTodo,
      testId: "dashboard-card-issues",
    },
    {
      title: "Todos",
      description: "Open to-dos",
      count: summary.openTodosCount,
      href: `${base}/todos`,
      icon: CheckSquare,
      testId: "dashboard-card-todos",
    },
    {
      title: "Meetings",
      description: "L10 meetings",
      count: summary.meetingsCount,
      href: `${base}/meetings`,
      icon: Video,
      testId: "dashboard-card-meetings",
    },
    {
      title: "AI suggestions",
      description: "Pending review",
      count: summary.pendingSuggestionsCount,
      href: `${base}/meetings`,
      icon: Sparkles,
      testId: "dashboard-card-ai",
    },
  ];

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="dashboard-summary-cards"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Link key={card.title} href={card.href} className="group block">
            <Card
              className="h-full transition-colors hover:border-primary/40 hover:bg-muted/30"
              data-testid={card.testId}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary transition-colors group-hover:bg-primary/15">
                  <Icon className="size-4" aria-hidden />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {card.count}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
