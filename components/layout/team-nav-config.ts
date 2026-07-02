import {
  BarChart3,
  CheckSquare,
  FileText,
  LayoutDashboard,
  ListTodo,
  Megaphone,
  Mountain,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface TeamNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const TEAM_NAV_ITEMS: TeamNavItem[] = [
  { label: "Overview", segment: "overview", icon: LayoutDashboard },
  { label: "People", segment: "people", icon: Users },
  { label: "L10", segment: "l10", icon: Video },
  { label: "Rocks", segment: "rocks", icon: Mountain },
  { label: "Scorecards", segment: "scorecard", icon: BarChart3 },
  { label: "To-Dos", segment: "todos", icon: CheckSquare },
  { label: "Headlines", segment: "headlines", icon: Megaphone },
  { label: "Issues", segment: "issues", icon: ListTodo },
  { label: "Process", segment: "process", icon: FileText },
];

export function getTeamNavHref(
  orgSlug: string,
  teamSlug: string,
  segment: string,
): string {
  return `/org/${orgSlug}/teams/${teamSlug}/${segment}`;
}

export function getL10HubHref(orgSlug: string, teamSlug: string): string {
  return getTeamNavHref(orgSlug, teamSlug, "l10");
}

export function isTeamNavActive(
  pathname: string,
  orgSlug: string,
  teamSlug: string,
  segment: string,
): boolean {
  const href = getTeamNavHref(orgSlug, teamSlug, segment);
  if (segment === "l10") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
