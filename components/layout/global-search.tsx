"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useOrgContext } from "@/features/organizations/components/org-context";
import { searchProjectsForNav } from "@/features/projects/actions";
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
  const [projectResults, setProjectResults] = useState<
    Awaited<ReturnType<typeof searchProjectsForNav>>
  >({ projects: [], workItems: [] });
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { orgSlug, orgId } = useOrgContext();

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

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setProjectResults({ projects: [], workItems: [] });
      return;
    }

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const results = await searchProjectsForNav(orgId, query.trim());
        setProjectResults(results);
      });
    }, 200);

    return () => window.clearTimeout(handle);
  }, [open, query, orgId]);

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
          placeholder="Search navigation and projects…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Global search"
          autoFocus
        />
        <div className="max-h-64 space-y-3 overflow-y-auto pt-2">
          {projectResults.projects.length > 0 && (
            <div>
              <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">
                Projects
              </p>
              <ul className="space-y-1">
                {projectResults.projects.map((project) => (
                  <li key={project.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        router.push(
                          `/org/${orgSlug}/projects/${project.slug}`,
                        );
                        setOpen(false);
                      }}
                    >
                      {project.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {projectResults.workItems.length > 0 && (
            <div>
              <p className="mb-1 px-3 text-xs font-medium text-muted-foreground">
                Work items
              </p>
              <ul className="space-y-1">
                {projectResults.workItems.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => {
                        router.push(
                          `/org/${orgSlug}/projects/${item.projectSlug}`,
                        );
                        setOpen(false);
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.identifier}
                      </span>{" "}
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-1">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
