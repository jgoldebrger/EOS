import { createClient } from "@/lib/supabase/server";
import { formatOwnerLabel } from "@/features/scorecard/utils";
import {
  getSevenDayEndDate,
  isTodoOverdue,
} from "@/features/todos/utils";
import type {
  TodoFilters,
  TodoMemberOption,
  TodoTeamOption,
  TodoWithOwner,
} from "@/features/todos/types";

function mapTodoRow(
  row: Record<string, unknown>,
  currentUserId: string | undefined,
  currentEmail: string | null,
): TodoWithOwner {
  const { teams: teamJoin, ...todo } = row as {
    teams: { name: string } | null;
    owner_id: string;
    due_date: string | null;
    status: TodoWithOwner["status"];
  } & Omit<TodoWithOwner, "teamName" | "owner" | "isOverdue">;

  const team = teamJoin;
  const ownerId = todo.owner_id;
  const ownerEmail = currentUserId === ownerId ? currentEmail : null;

  return {
    ...todo,
    teamName: team?.name ?? null,
    owner: {
      userId: ownerId,
      label: formatOwnerLabel(ownerId, ownerEmail),
      email: ownerEmail,
    },
    isOverdue: isTodoOverdue(todo.due_date, todo.status),
  };
}

export async function getTodosForOrg(
  organizationId: string,
  filters: TodoFilters = {},
): Promise<TodoWithOwner[]> {
  const supabase = await createClient();

  let query = supabase
    .from("todos")
    .select("*, teams(name)")
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("title", { ascending: true });

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.ownerId) {
    query = query.eq("owner_id", filters.ownerId);
  }
  if (filters.teamId) {
    query = query.eq("team_id", filters.teamId);
  }
  if (filters.sevenDayOnly) {
    query = query
      .eq("status", "open")
      .not("due_date", "is", null)
      .lte("due_date", getSevenDayEndDate());
  }

  const { data: todos, error } = await query;

  if (error || !todos) {
    return [];
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentEmail = user?.email ?? null;

  return todos.map((row) => mapTodoRow(row, user?.id, currentEmail));
}

export async function getSevenDayTodos(
  organizationId: string,
): Promise<TodoWithOwner[]> {
  return getTodosForOrg(organizationId, { sevenDayOnly: true });
}

export async function getOrgTeamsForTodos(
  organizationId: string,
): Promise<TodoTeamOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("id, name, slug")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export async function getOrgMembersForTodos(
  organizationId: string,
): Promise<TodoMemberOption[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, org_role")
    .eq("organization_id", organizationId)
    .in("org_role", ["owner", "admin", "member"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((member) => ({
    userId: member.user_id,
    orgRole: member.org_role,
    label:
      user?.id === member.user_id
        ? formatOwnerLabel(member.user_id, user.email)
        : formatOwnerLabel(member.user_id),
  }));
}
