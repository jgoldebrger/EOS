"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrgContext } from "@/features/organizations/components/org-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getGlobalNavHref } from "@/components/layout/global-nav-config";

const QUICK_LINKS = [
  { label: "Home", segment: "home" },
  { label: "Teams", segment: "teams" },
  { label: "People", segment: "people" },
  { label: "Company", segment: "company" },
  { label: "Projects", segment: "projects" },
  { label: "Inbox", segment: "inbox" },
  { label: "Activity", segment: "activity" },
  { label: "Reports", segment: "reports" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { orgSlug } = useOrgContext();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = QUICK_LINKS.filter((link) =>
    link.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Search navigation…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Global search"
          autoFocus
        />
        <ul className="max-h-64 space-y-1 overflow-y-auto pt-2">
          {filtered.map((link) => (
            <li key={link.segment}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  router.push(getGlobalNavHref(orgSlug, link.segment));
                  setOpen(false);
                }}
              >
                {link.label}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
