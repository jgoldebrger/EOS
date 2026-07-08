import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

function assertServerOnly() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() is server-only");
  }
}

/** Service-role client for Auth Admin API. Server-only. */
export function createAdminClient() {
  assertServerOnly();

  return createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    global: { fetch: supabaseFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
