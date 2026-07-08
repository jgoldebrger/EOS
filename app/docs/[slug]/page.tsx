import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocMarkdown } from "@/components/help/doc-markdown";
import { DocTableOfContents } from "@/components/help/doc-table-of-contents";
import { DocsShell } from "@/components/help/docs-shell";
import { extractDocHeadings } from "@/lib/docs/headings";
import { loadDocMarkdown } from "@/lib/docs/load-doc";
import { getAdjacentDocs, getAllDocSlugs, getDocEntry } from "@/lib/docs/manifest";
import { getServerSessionUser } from "@/lib/supabase/server";
import { getUserOrganizations } from "@/features/organizations/queries";

export function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = getDocEntry(slug);
  if (!entry) {
    return { title: "Not found — EOS Docs" };
  }
  return {
    title: `${entry.title} — EOS Docs`,
    description: entry.description,
  };
}

export default async function DocsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from: fromOrgSlug } = await searchParams;
  const entry = getDocEntry(slug);
  const markdown = loadDocMarkdown(slug);

  if (!entry || !markdown) {
    notFound();
  }

  const headings = extractDocHeadings(markdown);
  const { prev, next } = getAdjacentDocs(slug);

  const user = await getServerSessionUser();

  let appHomeHref: string | null = null;
  if (fromOrgSlug) {
    appHomeHref = `/org/${fromOrgSlug}/home`;
  } else if (user) {
    const orgs = await getUserOrganizations();
    if (orgs.length > 0) {
      appHomeHref = `/org/${orgs[0].slug}/home`;
    }
  }

  return (
    <DocsShell
      title={entry.title}
      description={entry.description}
      appHomeHref={appHomeHref}
      appHomeLabel="Back to app"
      prev={prev}
      next={next}
    >
      <div className="flex gap-10">
        <div className="min-w-0 flex-1">
          <DocMarkdown content={markdown} basePath="/docs" />
        </div>
        <DocTableOfContents headings={headings} />
      </div>
    </DocsShell>
  );
}
