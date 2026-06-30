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
  { label: "Agendas", segment: "agendas", icon: Video },
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

export function isTeamNavActive(
  pathname: string,
  orgSlug: string,
  teamSlug: string,
  segment: string,
): boolean {
  const href = getTeamNavHref(orgSlug, teamSlug, segment);
  return pathname === href || pathname.startsWith(`${href}/`);
}
