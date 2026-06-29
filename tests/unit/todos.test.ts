import { describe, expect, it } from "vitest";
import {
  cancelTodoSchema,
  completeTodoSchema,
  createTodoSchema,
  updateTodoSchema,
} from "@/features/todos/schema";
import {
  formatDueDate,
  getSevenDayEndDate,
  isInSevenDayWindow,
  isTodoOverdue,
} from "@/features/todos/utils";

const orgId = "550e8400-e29b-41d4-a716-446655440001";
const todoId = "550e8400-e29b-41d4-a716-446655440003";
const ownerId = "550e8400-e29b-41d4-a716-446655440002";

describe("isTodoOverdue", () => {
  it("flags open todos past due date", () => {
    expect(isTodoOverdue("2026-01-01", "open", new Date(2026, 5, 15))).toBe(
      true,
    );
  });

  it("does not flag done todos", () => {
    expect(isTodoOverdue("2026-01-01", "done", new Date(2026, 5, 15))).toBe(
      false,
    );
  });

  it("does not flag todos without due date", () => {
    expect(isTodoOverdue(null, "open", new Date(2026, 5, 15))).toBe(false);
  });
});

describe("isInSevenDayWindow", () => {
  const reference = new Date(2026, 5, 15);

  it("includes overdue open todos", () => {
    expect(isInSevenDayWindow("2026-06-10", "open", reference)).toBe(true);
  });

  it("includes todos due within 7 days", () => {
    expect(isInSevenDayWindow("2026-06-20", "open", reference)).toBe(true);
  });

  it("excludes todos due after 7 days", () => {
    expect(isInSevenDayWindow("2026-07-01", "open", reference)).toBe(false);
  });

  it("excludes open todos without due date", () => {
    expect(isInSevenDayWindow(null, "open", reference)).toBe(false);
  });
});

describe("getSevenDayEndDate", () => {
  it("returns date 7 days from reference", () => {
    expect(getSevenDayEndDate(new Date(2026, 5, 15))).toBe("2026-06-22");
  });
});

describe("formatDueDate", () => {
  it("formats ISO date strings", () => {
    const formatted = formatDueDate("2026-06-20");
    expect(formatted).toContain("Jun");
    expect(formatted).toContain("20");
  });

  it("handles null due dates", () => {
    expect(formatDueDate(null)).toBe("No due date");
  });
});

describe("createTodoSchema", () => {
  it("requires title and owner", () => {
    const result = createTodoSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid todo input", () => {
    const result = createTodoSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "Call vendor",
      dueDate: "2026-06-25",
      sourceType: "manual",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid due date format", () => {
    const result = createTodoSchema.safeParse({
      organizationId: orgId,
      ownerId,
      title: "Call vendor",
      dueDate: "06/25/2026",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateTodoSchema", () => {
  it("allows partial updates", () => {
    const result = updateTodoSchema.safeParse({
      organizationId: orgId,
      todoId,
      title: "Updated title",
    });

    expect(result.success).toBe(true);
  });
});

describe("completeTodoSchema", () => {
  it("requires organization and todo ids", () => {
    const result = completeTodoSchema.safeParse({
      organizationId: orgId,
      todoId,
    });

    expect(result.success).toBe(true);
  });
});

describe("cancelTodoSchema", () => {
  it("requires organization and todo ids", () => {
    const result = cancelTodoSchema.safeParse({
      organizationId: orgId,
      todoId,
    });

    expect(result.success).toBe(true);
  });
});
