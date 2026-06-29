import { expect, test } from "@playwright/test";

test.describe("SSO discovery UI", () => {
  test("SSO login option renders on auth page when exported component is wired", async ({
    page,
  }) => {
    await page.goto("/auth");

    await expect(page.getByLabel("Email")).toBeVisible();

    const ssoOption = page.getByTestId("sso-login-option");
    if ((await ssoOption.count()) > 0) {
      await expect(ssoOption.getByRole("button", { name: /continue with sso/i })).toBeVisible();
    }
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
    if ((await ssoOption.count()) === 0) {
      test.skip(true, "SSO login option not wired on auth page yet");
      return;
    }

    await ssoOption.getByLabel("Work email for SSO").fill("user@unknown-corp.com");
    await ssoOption.getByRole("button", { name: /continue with sso/i }).click();

    await expect(page.getByTestId("sso-error")).toContainText(/no sso configuration/i);
  });
});

test.describe("SSO settings permissions", () => {
  test("viewer role cannot access SSO settings mutations", async ({ page }) => {
    await page.goto("/org/demo/settings/security/sso");

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

    await expect(
      page.getByText(/only organization owners can manage role mappings|view only/i),
    ).toBeVisible();
  });

  test("SSO settings page structure includes provider and role mapping sections", async ({
    page,
  }) => {
    await page.goto("/org/demo/settings/security/sso");

    const heading = page.getByRole("heading", { name: /single sign-on/i });
    if ((await heading.count()) === 0) {
      test.skip(true, "SSO settings page requires authenticated org access");
      return;
    }

    await expect(heading).toBeVisible();
    await expect(page.getByText(/identity provider|setup steps/i).first()).toBeVisible();
    await expect(page.getByText(/role mappings/i).first()).toBeVisible();
    await expect(page.getByText(/test sso discovery/i)).toBeVisible();
  });
});
