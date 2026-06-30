"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  TEAM_NAV_ITEMS,
  getTeamNavHref,
  isTeamNavActive,
} from "@/components/layout/team-nav-config";
import { cn } from "@/lib/utils";
import { useOrgContext } from "@/features/organizations/components/org-context";
import { useTeamContext } from "@/features/teams/components/team-context";

interface TeamWorkspaceShellProps {
  teamSlug: string;
  teamName: string;
  children: React.ReactNode;
}

export function TeamWorkspaceShell({
  teamSlug,
  teamName,
  children,
}: TeamWorkspaceShellProps) {
  const pathname = usePathname();
  const { orgSlug } = useOrgContext();
  const { teams, setSelectedTeamId } = useTeamContext();

  useEffect(() => {
    const team = teams.find((t) => t.slug === teamSlug);
    if (team) {
      setSelectedTeamId(team.id);
    }
  }, [teamSlug, teams, setSelectedTeamId]);

  return (
    <div className="flex flex-col">
      <div className="border-b bg-muted/30 px-4 py-4 md:px-8">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{teamName}</h1>
      </div>

      <nav
        className="flex gap-0 overflow-x-auto border-b bg-background px-4 scrollbar-none md:px-8"
        aria-label="Team workspace"
      >
        {TEAM_NAV_ITEMS.map((item) => {
          const href = getTeamNavHref(orgSlug, teamSlug, item.segment);
          const active = isTeamNavActive(pathname, orgSlug, teamSlug, item.segment);

          return (
            <Link
              key={item.segment}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1">{children}</div>
    </div>
  );
}
