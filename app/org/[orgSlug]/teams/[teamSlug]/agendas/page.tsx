import { redirect } from "next/navigation";

export default async function LegacyTeamAgendasPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  redirect(`/org/${orgSlug}/teams/${teamSlug}/l10`);
}
