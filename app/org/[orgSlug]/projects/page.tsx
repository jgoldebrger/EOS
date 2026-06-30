import { requireOrgAccess } from "@/lib/auth/require-org-access";
import { getProjectsForOrg } from "@/features/activity/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FolderKanban } from "lucide-react";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const projects = await getProjectsForOrg(access.orgId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <PageHeader title="Projects" description="Track initiatives across teams." />
      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects"
          description="Create a project to group related work."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{project.title}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {project.status.replace("_", " ")}
                </Badge>
              </CardHeader>
              {project.due_date && (
                <CardContent className="text-sm text-muted-foreground">
                  Due {project.due_date}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
