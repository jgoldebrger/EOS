import { Suspense } from "react";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import {
  getOrgMembersForProjects,
  getOrgTeamsForProjects,
  getProjectsForOrg,
} from "@/features/projects/queries";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [projects, teams, members] = await Promise.all([
    getProjectsForOrg(access.orgId),
    getOrgTeamsForProjects(access.orgId),
    getOrgMembersForProjects(access.orgId),
  ]);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <Suspense>
        <ProjectsWorkspace
          organizationId={access.orgId}
          orgSlug={orgSlug}
          orgRole={access.role}
          projects={projects}
          teams={teams}
          members={members}
        />
      </Suspense>
    </div>
  );
}
