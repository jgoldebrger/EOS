"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_SECTIONS } from "@/lib/docs/manifest";
import { cn } from "@/lib/utils";

interface DocsSidebarProps {
  basePath?: string;
}

export function DocsSidebar({ basePath = "/docs" }: DocsSidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6" data-testid="docs-sidebar">
      <div>
        <Link
          href={basePath}
          className={cn(
            "block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
            pathname === basePath && "bg-muted text-foreground",
          )}
        >
          Documentation home
        </Link>
      </div>

      {DOC_SECTIONS.map((section) => (
        <div key={section.id} className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          {section.entries.map((entry) => {
            const href = `${basePath}/${entry.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={entry.slug}
                href={href}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted",
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
                )}
                data-testid={`docs-link-${entry.slug}`}
              >
                {entry.title}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
