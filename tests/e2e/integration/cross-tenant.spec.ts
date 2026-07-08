import { expect, test } from "@playwright/test";
import { E2E_ORG_SLUG, E2E_VIEWER_ORG_SLUG, signInAsAdmin, signInAsViewer } from "../helpers/auth";

test.describe("cross-tenant access denial (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and seeded org fixtures",
  );

  test("admin cannot access another organization's workspace", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`/org/${E2E_VIEWER_ORG_SLUG}/dashboard`);

    await expect(page.getByRole("heading", { name: "Demo Viewer Org" })).not.toBeVisible();
  });

  test("viewer cannot access the admin organization workspace", async ({ page }) => {
    await signInAsViewer(page);
    await page.goto(`/org/${E2E_ORG_SLUG}/dashboard`);

    await expect(page.getByRole("heading", { name: "Demo Company" })).not.toBeVisible();
  });
});
