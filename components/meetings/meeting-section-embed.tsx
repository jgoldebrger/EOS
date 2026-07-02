"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { getTeamNavHref } from "@/components/layout/team-nav-config";

interface MeetingSectionEmbedProps {
  orgSlug: string;
  sectionKey: string;
  teamSlug?: string;
}

const SECTION_ROUTES: Record<string, { label: string; segment: string; hint: string }> = {
  scorecard: {
    label: "Scorecard",
    segment: "scorecard",
    hint: "Review weekly metrics and status.",
  },
  rocks: {
    label: "Rocks",
    segment: "rocks",
    hint: "Check 90-day priorities and progress.",
  },
  todos: {
    label: "To-Dos",
    segment: "todos",
    hint: "Review open 7-day action items.",
  },
  issues: {
    label: "Issues",
    segment: "issues",
    hint: "Identify, Discuss, and Solve top issues.",
  },
  headlines: {
    label: "Headlines",
    segment: "headlines",
    hint: "Share customer and employee headlines.",
  },
};

export function MeetingSectionEmbed({
  orgSlug,
  sectionKey,
  teamSlug,
}: MeetingSectionEmbedProps) {
  const config = SECTION_ROUTES[sectionKey];

  if (!config) {
    return null;
  }

  const href = teamSlug
    ? getTeamNavHref(orgSlug, teamSlug, config.segment)
    : `/org/${orgSlug}/${config.segment}`;

  return (
    <Card data-testid={`section-embed-${sectionKey}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{config.label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{config.hint}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href={href} target="_blank" rel="noopener noreferrer">
            Open {config.label}
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
