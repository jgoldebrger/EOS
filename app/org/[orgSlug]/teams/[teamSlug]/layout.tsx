import { notFound } from "next/navigation";
import { requireTeamAccess } from "@/lib/auth/require-team-access";
import { TeamWorkspaceShell } from "@/components/layout/team-workspace-shell";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const access = await requireTeamAccess(orgSlug, teamSlug);

  return (
    <TeamWorkspaceShell teamSlug={access.teamSlug} teamName={access.teamName}>
      {children}
    </TeamWorkspaceShell>
  );
}
