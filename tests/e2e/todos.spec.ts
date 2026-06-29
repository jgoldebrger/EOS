import { expect, test } from "@playwright/test";
import { signInAsAdmin, signInAsViewer } from "./helpers/auth";

/**
 * Todos page structure tests.
 * Full viewer/edit flows require E2E_SUPABASE_ENABLED with seeded org data.
 */
test.describe("todos page structure (no Supabase)", () => {
  test("unauthenticated users are redirected from org todos", async ({ page }) => {
    await page.goto("/org/demo/todos");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("todos page (authenticated)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test("todos page renders list structure", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/todos`);

    await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
    await expect(
      page.getByTestId("todos-list").or(page.getByRole("status")),
    ).toBeVisible();
    await expect(page.getByTestId("todos-filters")).toBeVisible();
    await expect(page.getByTestId("todos-seven-day-toggle")).toBeVisible();
  });

  test("viewer cannot see add todo control", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/todos`);

    await expect(page.getByTestId("add-todo-button")).toHaveCount(0);
    await expect(page.getByTestId("todo-complete-checkbox")).toHaveCount(0);
  });

  test("admin can open todo creation dialog", async ({ page }) => {
    await signInAsAdmin(page);
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/todos`);

    await page.getByTestId("add-todo-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("create-todo-submit")).toBeVisible();
  });
});
