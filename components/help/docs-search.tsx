"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getFlatDocEntries } from "@/lib/docs/manifest";
import { Input } from "@/components/ui/input";

interface DocsSearchProps {
  basePath?: string;
}

export function DocsSearch({ basePath = "/docs" }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const entries = useMemo(() => getFlatDocEntries(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.slug.replaceAll("-", " ").includes(q),
    );
  }, [entries, query]);

  return (
    <div className="relative w-full max-w-md" data-testid="docs-search">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search documentation…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="pl-9"
        aria-label="Search documentation"
      />
      {results.length > 0 ? (
        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover p-2 shadow-lg">
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {results.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`${basePath}/${entry.slug}`}
                  className="block rounded-md px-3 py-2 hover:bg-muted"
                  onClick={() => setQuery("")}
                >
                  <p className="text-sm font-medium">{entry.title}</p>
                  <p className="text-xs text-muted-foreground">{entry.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
