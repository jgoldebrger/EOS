import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { signInAsAdmin } from "./helpers/auth";

const authDir = path.join(__dirname, ".auth");
const adminAuthFile = path.join(authDir, "admin.json");

async function globalSetup(config: FullConfig) {
  if (!process.env.E2E_SUPABASE_ENABLED) {
    return;
  }

  mkdirSync(authDir, { recursive: true });

  const baseURL =
    config.projects[0]?.use?.baseURL?.toString() ?? "http://localhost:3000";
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  await signInAsAdmin(page);
  await page.context().storageState({ path: adminAuthFile });
  await browser.close();
}

export default globalSetup;
