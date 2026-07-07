import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { DocsSearch } from "@/components/help/docs-search";
import { DocsSidebar } from "@/components/help/docs-sidebar";
import { Button } from "@/components/ui/button";
import type { DocEntry } from "@/lib/docs/manifest";

interface DocsShellProps {
  basePath?: string;
  title?: string;
  description?: string;
  appHomeHref?: string | null;
  appHomeLabel?: string;
  prev?: DocEntry | null;
  next?: DocEntry | null;
  children: React.ReactNode;
}

export function DocsShell({
  basePath = "/docs",
  title,
  description,
  appHomeHref,
  appHomeLabel = "Open app",
  prev,
  next,
  children,
}: DocsShellProps) {
  return (
    <div className="min-h-screen bg-background" data-testid="docs-shell">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-4">
            <Link href={basePath} className="flex items-center gap-2 font-semibold tracking-tight">
              <BookOpen className="size-5 text-primary" />
              EOS Docs
            </Link>
            {appHomeHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={appHomeHref}>{appHomeLabel}</Link>
              </Button>
            ) : null}
          </div>
          <DocsSearch basePath={basePath} />
          {!appHomeHref ? (
            <Button asChild size="sm" className="shrink-0">
              <Link href="/auth">Sign in</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-10 px-4 py-8 md:px-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">
            <DocsSidebar basePath={basePath} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-8">
          {title ? (
            <div className="space-y-2 border-b pb-6 lg:hidden">
              <DocsSidebar basePath={basePath} />
            </div>
          ) : null}

          {title ? (
            <div className="space-y-2 border-b pb-6">
              <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
              {description ? <p className="text-lg text-muted-foreground">{description}</p> : null}
            </div>
          ) : null}

          {children}

          {prev || next ? (
            <nav
              className="flex flex-col gap-3 border-t pt-8 sm:flex-row sm:justify-between"
              aria-label="Article navigation"
            >
              {prev ? (
                <Link
                  href={`${basePath}/${prev.slug}`}
                  className="group flex max-w-sm flex-col rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ChevronLeft className="size-3" />
                    Previous
                  </span>
                  <span className="font-medium group-hover:text-primary">{prev.title}</span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link
                  href={`${basePath}/${next.slug}`}
                  className="group flex max-w-sm flex-col rounded-lg border p-4 text-right transition-colors hover:bg-muted/50 sm:ml-auto"
                >
                  <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    Next
                    <ChevronRight className="size-3" />
                  </span>
                  <span className="font-medium group-hover:text-primary">{next.title}</span>
                </Link>
              ) : null}
            </nav>
          ) : null}
        </main>
      </div>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>
          EOS Platform documentation ·{" "}
          <Link href="/auth" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>{" "}
          to open your workspace
        </p>
      </footer>
    </div>
  );
}
