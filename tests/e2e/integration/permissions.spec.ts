import { expect, test } from "@playwright/test";
import { signInAsViewer } from "../helpers/auth";

/**
 * Viewer read-only permission structure across EOS modules.
 *
 * These tests document expected viewer UX. They are skipped unless
 * E2E_SUPABASE_ENABLED is set with seeded org fixtures:
 *   - E2E_ORG_SLUG        — admin/owner org for edit controls
 *   - E2E_VIEWER_ORG_SLUG  — viewer-only org for read-only checks
 *
 * Module-specific specs in tests/e2e/*.spec.ts mirror these patterns.
 */
const viewerReadOnlyModules = [
  {
    name: "scorecard",
    path: (slug: string) => `/org/${slug}/scorecard`,
    addControl: "add-metric-button",
    editableCell: "scorecard-cell-editable",
  },
  {
    name: "rocks",
    path: (slug: string) => `/org/${slug}/rocks`,
    addControl: "add-rock-button",
    editableCell: "rock-status-select",
  },
  {
    name: "issues",
    path: (slug: string) => `/org/${slug}/issues`,
    addControl: "add-issue-button",
    editableCell: "issue-priority-control",
  },
  {
    name: "todos",
    path: (slug: string) => `/org/${slug}/todos`,
    addControl: "add-todo-button",
    editableCell: "todo-complete-checkbox",
  },
  {
    name: "meetings",
    path: (slug: string) => `/org/${slug}/meetings`,
    addControl: "schedule-meeting-button",
    editableCell: "meeting-start-button",
  },
  {
    name: "accountability",
    path: (slug: string) => `/org/${slug}/accountability`,
    addControl: "add-seat-button",
    editableCell: "seat-edit-control",
  },
  {
    name: "vto",
    path: (slug: string) => `/org/${slug}/vto`,
    addControl: "save-snapshot-button",
    editableCell: "vto-section-save",
  },
] as const;

test.describe("viewer read-only structure (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and E2E_VIEWER_ORG_SLUG fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await signInAsViewer(page);
  });

  for (const mod of viewerReadOnlyModules) {
    test(`viewer cannot mutate ${mod.name}`, async ({ page }) => {
      const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
      await page.goto(mod.path(orgSlug));

      await expect(page.getByTestId(mod.addControl)).toHaveCount(0);
      await expect(page.getByTestId(mod.editableCell)).toHaveCount(0);
    });
  }

  test("viewer cannot manage SSO settings", async ({ page }) => {
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/settings/security/sso`);

    const saveButton = page.getByRole("button", { name: /^save settings$/i });
    const addMapping = page.getByRole("button", { name: /add mapping/i });

    if ((await saveButton.count()) > 0) {
      await expect(saveButton).toBeDisabled();
    }
    if ((await addMapping.count()) > 0) {
      await expect(addMapping).toBeDisabled();
    }
  });
});

test.describe("viewer read-only documentation (no Supabase)", () => {
  test("module specs document viewer skip patterns", () => {
    test.info().annotations.push({
      type: "note",
      description:
        "Viewer read-only checks live in tests/e2e/*.spec.ts and tests/unit/permissions.test.ts. " +
        "Set E2E_SUPABASE_ENABLED=1 with seeded orgs to run authenticated permission flows.",
    });
  });
});
