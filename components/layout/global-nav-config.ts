import {
  Activity,
  Building2,
  FileText,
  FolderKanban,
  Home,
  Inbox,
  BarChart3,
  Truck,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export interface GlobalNavItem {
  label: string;
  segment: string;
  icon: LucideIcon;
}

export const GLOBAL_NAV_ITEMS: GlobalNavItem[] = [
  { label: "Home", segment: "home", icon: Home },
  { label: "Inbox", segment: "inbox", icon: Inbox },
  { label: "Activity", segment: "activity", icon: Activity },
  { label: "Reports", segment: "reports", icon: BarChart3 },
  { label: "Teams", segment: "teams", icon: UsersRound },
  { label: "People", segment: "people", icon: Users },
  { label: "Process", segment: "process", icon: FileText },
  { label: "Company", segment: "company", icon: Building2 },
  { label: "Projects", segment: "projects", icon: FolderKanban },
  { label: "Transport", segment: "transport", icon: Truck },
];

export function getGlobalNavHref(orgSlug: string, segment: string): string {
  return `/org/${orgSlug}/${segment}`;
}

export function isGlobalNavActive(
  pathname: string,
  orgSlug: string,
  segment: string,
): boolean {
  const href = getGlobalNavHref(orgSlug, segment);
  if (segment === "teams") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
