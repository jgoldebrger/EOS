import { createClient } from "@/lib/supabase/server";
import { getOrgMemberOptions } from "@/lib/users/org-member-options";
import {
  ownerLabelFromProfiles,
  resolveOwnerProfiles,
} from "@/lib/users/owner-labels";
import type { ResolvedUser } from "@/lib/users/resolve-emails";
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
  ownerProfiles: Map<string, ResolvedUser>,
): TodoWithOwner {
  const { teams: teamJoin, ...todo } = row as {
    teams: { name: string } | null;
    owner_id: string;
    due_date: string | null;
    status: TodoWithOwner["status"];
  } & Omit<TodoWithOwner, "teamName" | "owner" | "isOverdue">;

  const team = teamJoin;
  const ownerId = todo.owner_id;
  const ownerProfile = ownerProfiles.get(ownerId);

  return {
    ...todo,
    teamName: team?.name ?? null,
    owner: {
      userId: ownerId,
      label: ownerLabelFromProfiles(ownerProfiles, ownerId),
      email: ownerProfile?.email ?? null,
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

  const ownerProfiles = await resolveOwnerProfiles(
    todos.map((row) => row.owner_id),
    organizationId,
  );

  return todos.map((row) => mapTodoRow(row, ownerProfiles));
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
  return getOrgMemberOptions(organizationId);
}
