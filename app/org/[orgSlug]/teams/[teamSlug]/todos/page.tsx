import { TodosWorkspace } from "@/components/todos/todos-workspace";
import {
  getOrgMembersForTodos,
  getOrgTeamsForTodos,
  getTodosForOrg,
} from "@/features/todos/queries";
import { getTeamPageContext } from "@/lib/team-page-context";

export default async function TeamTodosPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamSlug: string }>;
}) {
  const { orgSlug, teamSlug } = await params;
  const ctx = await getTeamPageContext(orgSlug, teamSlug);

  const [todos, teams, members] = await Promise.all([
    getTodosForOrg(ctx.orgId, { teamId: ctx.teamId }),
    getOrgTeamsForTodos(ctx.orgId),
    getOrgMembersForTodos(ctx.orgId),
  ]);

  return (
    <div className="p-8">
      <TodosWorkspace
        organizationId={ctx.orgId}
        orgRole={ctx.orgRole}
        currentUserId={ctx.userId}
        isTeamLeader={ctx.isTeamLeader}
        canEdit={ctx.canCreate}
        todos={todos}
        teams={teams}
        members={members}
      />
    </div>
  );
}
