import { notFound } from "next/navigation";
import { requireOrgAccess } from "@/lib/auth/require-org-access";
import {
  getLinkableIssues,
  getLinkableRocks,
  getLinkableTodos,
  getOrgMembersForProjects,
  getProjectAnalytics,
  getProjectDetail,
} from "@/features/projects/queries";
import { ProjectWorkspace } from "@/components/projects/project-workspace";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  const project = await getProjectDetail(access.orgId, projectSlug);
  if (!project) {
    notFound();
  }

  const [members, analytics, linkableIssues, linkableRocks, linkableTodos] =
    await Promise.all([
      getOrgMembersForProjects(access.orgId),
      getProjectAnalytics(access.orgId, project.id),
      getLinkableIssues(access.orgId),
      getLinkableRocks(access.orgId),
      getLinkableTodos(access.orgId),
    ]);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <ProjectWorkspace
        orgSlug={orgSlug}
        orgRole={access.role}
        project={project}
        members={members}
        analytics={analytics}
        linkableIssues={linkableIssues}
        linkableRocks={linkableRocks}
        linkableTodos={linkableTodos}
      />
    </div>
  );
}
