import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const authFile = path.join(__dirname, "tests/e2e/.auth/admin.json");

/** Default Supabase local demo keys — allow smoke E2E without a running instance */
const defaultSupabaseEnv: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
  SUPABASE_URL:
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    "http://127.0.0.1:54321",
  SUPABASE_PUBLISHABLE_KEY:
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  SUPABASE_SECRET_KEY:
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "",
  SUPABASE_JWKS_URL:
    process.env.SUPABASE_JWKS_URL ??
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"}/auth/v1/.well-known/jwks.json`,
  SUPABASE_SERVICE_ROLE_KEY:
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
  E2E_SUPABASE_ENABLED: process.env.E2E_SUPABASE_ENABLED ?? "",
  E2E_ORG_SLUG: process.env.E2E_ORG_SLUG ?? "demo",
  E2E_VIEWER_ORG_SLUG: process.env.E2E_VIEWER_ORG_SLUG ?? "demo-viewer",
  E2E_TEAM_SLUG: process.env.E2E_TEAM_SLUG ?? "leadership",
  E2E_MEETING_ID: process.env.E2E_MEETING_ID ?? "55555555-5555-5555-5555-555555555555",
};

const useSupabaseFixtures = Boolean(process.env.E2E_SUPABASE_ENABLED);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: {
    timeout: process.env.CI ? 30_000 : 5_000,
  },
  reporter: "html",
  globalSetup: useSupabaseFixtures ? "./tests/e2e/global-setup.ts" : undefined,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    storageState: useSupabaseFixtures ? authFile : undefined,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: defaultSupabaseEnv,
  },
});
