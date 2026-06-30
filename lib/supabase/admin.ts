import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

/** Service-role client for Auth Admin API. Server-only. */
export function createAdminClient() {
  return createClient<Database>(getSupabaseUrl(), getSupabaseSecretKey(), {
    global: { fetch: supabaseFetch },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
