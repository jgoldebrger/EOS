import {
  BarChart3,
  CheckSquare,
  Compass,
  LayoutDashboard,
  ListTodo,
  Mountain,
  Settings,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

export interface OrgNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path segment after /org/[orgSlug]/ used for active matching */
  segment: string;
}

export function getOrgNavItems(orgSlug: string): OrgNavItem[] {
  const base = `/org/${orgSlug}`;

  return [
    {
      label: "Dashboard",
      href: `${base}/dashboard`,
      segment: "dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Scorecard",
      href: `${base}/scorecard`,
      segment: "scorecard",
      icon: BarChart3,
    },
    {
      label: "Rocks",
      href: `${base}/rocks`,
      segment: "rocks",
      icon: Mountain,
    },
    {
      label: "V/TO",
      href: `${base}/vto`,
      segment: "vto",
      icon: Compass,
    },
    {
      label: "Issues",
      href: `${base}/issues`,
      segment: "issues",
      icon: ListTodo,
    },
    {
      label: "Todos",
      href: `${base}/todos`,
      segment: "todos",
      icon: CheckSquare,
    },
    {
      label: "Meetings",
      href: `${base}/meetings`,
      segment: "meetings",
      icon: Video,
    },
    {
      label: "Accountability",
      href: `${base}/accountability`,
      segment: "accountability",
      icon: Users,
    },
    {
      label: "Settings",
      href: `${base}/settings`,
      segment: "settings",
      icon: Settings,
    },
  ];
}

export function isNavItemActive(pathname: string, orgSlug: string, segment: string): boolean {
  const prefix = `/org/${orgSlug}/${segment}`;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}
