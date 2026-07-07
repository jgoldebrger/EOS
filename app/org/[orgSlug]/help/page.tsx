import { redirect } from "next/navigation";

export default async function HelpIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  redirect(`/docs?from=${orgSlug}`);
}
