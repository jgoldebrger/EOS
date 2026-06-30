import { redirectToTeamTab } from "@/lib/redirect-to-team";

export default async function LegacyIssuesRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await redirectToTeamTab(orgSlug, "issues");
}
