import { redirect } from "next/navigation";
import { getDocEntry } from "@/lib/docs/manifest";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = await params;
  if (!getDocEntry(slug)) {
    redirect(`/docs?from=${orgSlug}`);
  }
  redirect(`/docs/${slug}?from=${orgSlug}`);
}
