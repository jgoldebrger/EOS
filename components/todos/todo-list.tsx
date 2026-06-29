"use client";

import { useCallback, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { completeTodo } from "@/features/todos/actions";
import { formatDueDate } from "@/features/todos/utils";
import type { TodoWithOwner } from "@/features/todos/types";
import { OverdueBadge } from "@/components/todos/overdue-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { OwnerAvatar } from "@/components/shared/owner-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { showErrorToast } from "@/components/feedback/toast";
import { canManageOrg } from "@/lib/permissions/checks";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/types/domain";

interface TodoListProps {
  organizationId: string;
  orgRole: OrgRole;
  currentUserId: string;
  isTeamLeader: boolean;
  todos: TodoWithOwner[];
  canEdit: boolean;
  sevenDayView: boolean;
}

function canEditTodo(
  todo: TodoWithOwner,
  orgRole: OrgRole,
  currentUserId: string,
  isTeamLeader: boolean,
): boolean {
  if (orgRole === "viewer") {
    return false;
  }

  return (
    todo.owner_id === currentUserId ||
    canManageOrg(orgRole) ||
    (isTeamLeader && todo.team_id !== null)
  );
}

export function TodoList({
  organizationId,
  orgRole,
  currentUserId,
  isTeamLeader,
  todos,
  canEdit,
  sevenDayView,
}: TodoListProps) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const handleComplete = useCallback(
    (todo: TodoWithOwner) => {
      if (!canEditTodo(todo, orgRole, currentUserId, isTeamLeader)) {
        return;
      }

      setPendingIds((prev) => new Set(prev).add(todo.id));

      startTransition(async () => {
        const result = await completeTodo({
          organizationId,
          todoId: todo.id,
        });

        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(todo.id);
          return next;
        });

        if (!result.success) {
          showErrorToast("Could not complete todo", result.error);
        }
      });
    },
    [organizationId, orgRole, currentUserId, isTeamLeader],
  );

  if (todos.length === 0) {
    return (
      <EmptyState
        title={sevenDayView ? "No todos due this week" : "No todos yet"}
        description={
          sevenDayView
            ? "Open todos with a due date in the next 7 days (or overdue) appear here."
            : canEdit
              ? "Add accountable actions with owners and due dates."
              : "Todos will appear here when your team adds them."
        }
      />
    );
  }

  return (
    <ul
      className="divide-y rounded-lg border bg-card"
      data-testid="todos-list"
      aria-label="Todos"
    >
      {todos.map((todo) => {
        const editable =
          canEdit && canEditTodo(todo, orgRole, currentUserId, isTeamLeader);
        const isDone = todo.status === "done";
        const isPending = pendingIds.has(todo.id);

        return (
          <li
            key={todo.id}
            className={cn(
              "flex items-start gap-4 px-4 py-3 transition-colors",
              todo.isOverdue && "bg-destructive/5",
              isDone && "opacity-60",
            )}
            data-testid="todo-row"
          >
            {editable ? (
              <button
                type="button"
                data-testid="todo-complete-checkbox"
                disabled={isDone || isPending}
                aria-label={
                  isDone ? "Completed" : `Mark "${todo.title}" complete`
                }
                aria-pressed={isDone}
                onClick={() => handleComplete(todo)}
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  isDone
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-input hover:border-primary hover:bg-primary/5",
                  isPending && "opacity-50",
                )}
              >
                {(isDone || isPending) && (
                  <Check className="h-3 w-3" aria-hidden />
                )}
              </button>
            ) : (
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                  isDone
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-muted bg-muted/30",
                )}
                aria-hidden
              >
                {isDone && <Check className="h-3 w-3" />}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "font-medium",
                    isDone && "line-through text-muted-foreground",
                    todo.isOverdue && !isDone && "text-destructive",
                  )}
                >
                  {todo.title}
                </p>
                {todo.isOverdue && !isDone && <OverdueBadge />}
                {!sevenDayView && <StatusBadge status={todo.status} />}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <OwnerAvatar name={todo.owner.label} size="sm" />
                  <span>{todo.owner.label}</span>
                </div>
                {todo.due_date && (
                  <span
                    className={cn(
                      todo.isOverdue && !isDone && "font-medium text-destructive",
                    )}
                  >
                    Due {formatDueDate(todo.due_date)}
                  </span>
                )}
                {todo.teamName && <span>{todo.teamName}</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
