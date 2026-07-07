import { mkdirSync } from "node:fs";
import path from "node:path";
import { test as setup } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

const authDir = path.join(__dirname, ".auth");
const adminAuthFile = path.join(authDir, "admin.json");

setup("authenticate as admin", async ({ page }) => {
  mkdirSync(authDir, { recursive: true });
  await signInAsAdmin(page);
  await page.context().storageState({ path: adminAuthFile });
});
