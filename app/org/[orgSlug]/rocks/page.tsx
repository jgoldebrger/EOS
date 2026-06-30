import { redirectToTeamTab } from "@/lib/redirect-to-team";

export default async function LegacyRocksRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  await redirectToTeamTab(orgSlug, "rocks");
}
