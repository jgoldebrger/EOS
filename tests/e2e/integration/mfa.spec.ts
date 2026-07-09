import { expect, test } from "@playwright/test";
import { E2E_ORG_SLUG, signInAsAdmin } from "../helpers/auth";

test.describe("MFA security (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and seeded org fixtures",
  );

  test("admin can open MFA settings page", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`/org/${E2E_ORG_SLUG}/settings/security`);

    await expect(page.getByTestId("security-mfa-link")).toBeVisible();
    await page.getByTestId("security-mfa-link").click();

    await expect(page.getByRole("heading", { name: /multi-factor authentication/i })).toBeVisible();
    await expect(page.getByTestId("mfa-enroll-start-button")).toBeVisible();
  });

  test("security hub shows org MFA policy controls for admin", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`/org/${E2E_ORG_SLUG}/settings/security`);

    await expect(page.getByTestId("org-mfa-policy-toggle")).toBeVisible();
    await expect(page.getByTestId("org-mfa-policy-save")).toBeVisible();
  });
});
