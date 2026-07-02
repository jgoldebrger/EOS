"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PeoplePageTabsProps {
  orgSlug: string;
}

export function PeoplePageTabs({ orgSlug }: PeoplePageTabsProps) {
  const pathname = usePathname();
  const base = `/org/${orgSlug}/people`;
  const tabs = [
    { href: base, label: "Directory" },
    { href: `${base}/analyzer`, label: "Analyzer" },
  ];

  return (
    <nav className="flex gap-1 border-b" aria-label="People sections">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
