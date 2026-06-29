"use client";

import { useMemo, useState } from "react";
import { isInSevenDayWindow } from "@/features/todos/utils";
import type {
  TodoFilters,
  TodoMemberOption,
  TodoTeamOption,
  TodoWithOwner,
} from "@/features/todos/types";
import { TodosPageHeader } from "@/components/todos/todos-page-header";
import { TodoList } from "@/components/todos/todo-list";
import type { OrgRole } from "@/types/domain";

interface TodosWorkspaceProps {
  organizationId: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  canEdit: boolean;
  todos: TodoWithOwner[];
  teams: TodoTeamOption[];
  members: TodoMemberOption[];
}

export function TodosWorkspace({
  organizationId,
  orgRole,
  currentUserId,
  isTeamLeader,
  canEdit,
  todos,
  teams,
  members,
}: TodosWorkspaceProps) {
  const [filters, setFilters] = useState<TodoFilters>({ sevenDayOnly: true });

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filters.sevenDayOnly && !isInSevenDayWindow(todo.due_date, todo.status)) {
        return false;
      }
      if (filters.ownerId && todo.owner_id !== filters.ownerId) return false;
      if (filters.status && todo.status !== filters.status) return false;
      if (filters.teamId && todo.team_id !== filters.teamId) return false;
      return true;
    });
  }, [todos, filters]);

  return (
    <div className="space-y-8">
      <TodosPageHeader
        organizationId={organizationId}
        canCreate={canEdit}
        teams={teams}
        members={members}
        defaultOwnerId={currentUserId}
        filters={filters}
        onFiltersChange={setFilters}
      />
      <TodoList
        organizationId={organizationId}
        orgRole={orgRole}
        currentUserId={currentUserId}
        isTeamLeader={isTeamLeader}
        todos={filteredTodos}
        canEdit={canEdit}
        sevenDayView={filters.sevenDayOnly ?? false}
      />
    </div>
  );
}
