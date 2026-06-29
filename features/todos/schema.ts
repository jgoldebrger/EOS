import { z } from "zod";

const todoStatusSchema = z.enum(["open", "done", "cancelled"]);
const todoSourceTypeSchema = z.enum(["issue", "rock", "meeting", "manual"]);

const todoBaseSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  teamId: z.string().uuid("Invalid team").nullable().optional(),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  ownerId: z.string().uuid("Invalid owner"),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date")
    .nullable()
    .optional(),
  status: todoStatusSchema.optional(),
  sourceType: todoSourceTypeSchema.nullable().optional(),
  sourceId: z.string().uuid("Invalid source").nullable().optional(),
});

export const createTodoSchema = todoBaseSchema;

export const updateTodoSchema = todoBaseSchema
  .partial()
  .extend({
    todoId: z.string().uuid("Invalid todo"),
    organizationId: z.string().uuid("Invalid organization"),
  });

export const completeTodoSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  todoId: z.string().uuid("Invalid todo"),
});

export const cancelTodoSchema = z.object({
  organizationId: z.string().uuid("Invalid organization"),
  todoId: z.string().uuid("Invalid todo"),
});

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type CompleteTodoInput = z.infer<typeof completeTodoSchema>;
export type CancelTodoInput = z.infer<typeof cancelTodoSchema>;
