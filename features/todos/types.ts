import type { Tables, TodoSourceTypeDb, TodoStatusDb } from "@/types/database";

export type Todo = Tables<"todos">;

export interface TodoOwner {
  userId: string;
  label: string;
  email?: string | null;
}

export interface TodoWithOwner extends Todo {
  teamName: string | null;
  owner: TodoOwner;
  isOverdue: boolean;
}

export interface TodoFilters {
  status?: TodoStatusDb;
  ownerId?: string;
  teamId?: string;
  sevenDayOnly?: boolean;
  includeArchived?: boolean;
}

export interface TodoTeamOption {
  id: string;
  name: string;
  slug: string;
}

export interface TodoMemberOption {
  userId: string;
  orgRole: string;
  label: string;
}

export type TodoActionResult =
  | { success: true }
  | { success: false; error: string };

export type CreateTodoResult =
  | { success: true; todoId: string }
  | { success: false; error: string };

export type { TodoSourceTypeDb, TodoStatusDb };
