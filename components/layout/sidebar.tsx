"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getOrgNavItems, isNavItemActive } from "@/components/layout/nav-config";

interface SidebarProps {
  orgSlug: string;
  orgName: string;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({ orgSlug, orgName, onNavigate, className }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getOrgNavItems(orgSlug);

  return (
    <aside
      className={cn("flex h-full w-64 flex-col border-r bg-card/40", className)}
      aria-label="Organization navigation"
    >
      <div className="border-b px-4 py-5">
        <p className="truncate text-sm font-semibold tracking-tight">{orgName}</p>
        <p className="truncate text-xs text-muted-foreground">/{orgSlug}</p>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main">
        {navItems.map((item) => {
          const active = isNavItemActive(pathname, orgSlug, item.segment);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
