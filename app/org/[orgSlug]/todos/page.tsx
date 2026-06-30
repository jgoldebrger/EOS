import { redirectToTeamTab } from "@/lib/redirect-to-team";

export default async function LegacyTodosRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await redirectToTeamTab(orgSlug, "todos");
}
