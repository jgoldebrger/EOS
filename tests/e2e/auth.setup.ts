import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_ORG_SLUG, waitForOrgLanding } from "./helpers/auth";
import { injectSupabaseSession } from "./helpers/supabase-session";

const authDir = path.join(__dirname, ".auth");
const adminAuthFile = path.join(authDir, "admin.json");

setup("authenticate as admin", async ({ context, page }) => {
  mkdirSync(authDir, { recursive: true });

  await injectSupabaseSession(context, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD);
  await page.goto(`/org/${E2E_ORG_SLUG}/dashboard`);
  await waitForOrgLanding(page, E2E_ORG_SLUG);
  await expect(page.getByRole("heading", { name: "Demo Company" })).toBeVisible();

  await context.storageState({ path: adminAuthFile });
});
