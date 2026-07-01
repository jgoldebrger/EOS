"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import {
  GLOBAL_NAV_ITEMS,
  getGlobalNavHref,
  isGlobalNavActive,
} from "@/components/layout/global-nav-config";
import { CreateMenu } from "@/components/layout/create-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useOrgContext } from "@/features/organizations/components/org-context";
import { useSelectedTeam } from "@/features/teams/components/team-context";

export function TopNav() {
  const pathname = usePathname();
  const { orgSlug, orgName } = useOrgContext();
  const selectedTeam = useSelectedTeam();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-12 items-center gap-4 px-4 md:px-6">
        <Link
          href={getGlobalNavHref(orgSlug, "home")}
          className="hidden shrink-0 text-sm font-semibold tracking-tight md:block"
        >
          {orgName}
        </Link>

        <nav
          className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-none"
          aria-label="Global navigation"
        >
          {GLOBAL_NAV_ITEMS.map((item) => {
            const href = getGlobalNavHref(orgSlug, item.segment);
            const active = isGlobalNavActive(pathname, orgSlug, item.segment);
            const Icon = item.icon;

            return (
              <Link
                key={item.segment}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors md:px-3 md:text-sm",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <GlobalSearch />
          <CreateMenu teamSlug={selectedTeam?.teamSlug} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                aria-label="Account menu"
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">Account</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild>
                <Link href={`/org/${orgSlug}/profile`}>Your profile</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action={signOut} className="w-full">
                  <button type="submit" className="w-full text-left">
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
