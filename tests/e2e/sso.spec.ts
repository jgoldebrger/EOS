import { expect, test } from "@playwright/test";
import { signInAsViewer } from "./helpers/auth";
import { ensureAdminSession } from "./helpers/auth-fixture";

test.describe("SSO discovery UI", () => {
  test("SSO login option renders on auth page", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByRole("textbox", { name: "Email", exact: true })).toBeVisible();

    const ssoOption = page.getByTestId("sso-login-option");
    await expect(ssoOption).toBeVisible();
    await expect(ssoOption.getByRole("button", { name: /continue with sso/i })).toBeVisible();
  });

  test("unknown domain shows safe error in SSO discovery preview", async ({ page }) => {
    await page.route("**/discover-sso-provider", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "not_found" }),
      });
    });

    await page.goto("/auth");

    const ssoOption = page.getByTestId("sso-login-option");
    await ssoOption.getByLabel("Work email for SSO").fill("user@unknown-corp.com");
    await ssoOption.getByRole("button", { name: /continue with sso/i }).click();

    await expect(page.getByTestId("sso-error")).toContainText(/no sso configuration/i);
  });
});

test.describe("SSO settings without Supabase", () => {
  test("unauthenticated users are redirected from SSO settings", async ({ page }) => {
    await page.goto("/org/demo/settings/security/sso");
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe("SSO settings (@auth)", () => {
  test.skip(
    !process.env.E2E_SUPABASE_ENABLED,
    "Requires E2E_SUPABASE_ENABLED and authenticated session fixtures",
  );

  test.beforeEach(async ({ page }) => {
    await ensureAdminSession(page);
  });

  test("viewer role cannot access SSO settings mutations", async ({ page }) => {
    await signInAsViewer(page);
    const orgSlug = process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer";
    await page.goto(`/org/${orgSlug}/settings/security/sso`);

    const restricted = page.getByText(/access restricted|view only|owner permissions/i);
    const saveButton = page.getByRole("button", { name: /^save settings$/i });
    const addMapping = page.getByRole("button", { name: /add mapping/i });

    if ((await restricted.count()) > 0) {
      await expect(restricted.first()).toBeVisible();
      return;
    }

    if ((await saveButton.count()) > 0) {
      await expect(saveButton).toBeDisabled();
    }

    if ((await addMapping.count()) > 0) {
      await expect(addMapping).toBeDisabled();
    }

    const ownerOnlyMessage = page.getByText(
      /only organization owners can manage role mappings|view only/i,
    );
    if ((await ownerOnlyMessage.count()) > 0) {
      await expect(ownerOnlyMessage.first()).toBeVisible();
    }
  });

  test("SSO settings page structure includes provider and role mapping sections", async ({
    page,
  }) => {
    const orgSlug = process.env.E2E_ORG_SLUG ?? "demo";
    await page.goto(`/org/${orgSlug}/settings/security/sso`);

    await expect(page.getByRole("heading", { name: /single sign-on/i })).toBeVisible();
    await expect(page.getByText(/identity provider|setup steps/i).first()).toBeVisible();
    await expect(page.getByText(/role mappings/i).first()).toBeVisible();
    await expect(page.getByText(/test sso discovery/i)).toBeVisible();
  });
});
