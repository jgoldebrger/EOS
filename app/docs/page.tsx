import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { DocsShell } from "@/components/help/docs-shell";
import { DOC_SECTIONS, DEFAULT_DOC_SLUG } from "@/lib/docs/manifest";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Documentation — EOS Platform",
  description: "User guide for EOS — scorecards, rocks, issues, L10 meetings, and more.",
};

export default function DocsHomePage() {
  return (
    <DocsShell>
      <div className="space-y-12" data-testid="docs-home">
        <section className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">EOS Platform documentation</h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Everything you need to run EOS in your organization — from your first sign-in to
            weekly L10 meetings, scorecards, rocks, and leadership tools.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/docs/${DEFAULT_DOC_SLUG}`}>
                Get started
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/docs/l10-meetings">Run an L10</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {DOC_SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-4 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.entries.length} articles</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.entries.map((entry) => (
                  <Link
                    key={entry.slug}
                    href={`/docs/${entry.slug}`}
                    className="block rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{entry.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entry.description}
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </DocsShell>
  );
}
