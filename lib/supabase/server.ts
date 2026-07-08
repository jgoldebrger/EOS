import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { createAdminClient } from "@/lib/supabase/admin";

async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Server Supabase client scoped to the signed-in user's JWT (RLS enforced).
 * Never expose to the browser.
 */
export const createClient = cache(createAuthClient);

/** Explicit service-role client for break-glass server paths only. */
export const createServiceClient = cache(() => createAdminClient());

/** One auth lookup per request — avoids repeated getUser() round trips. */
export const getServerSessionUser = cache(async () => {
  const supabase = await createClient();
  const allowSessionFallback =
    process.env.NODE_ENV === "development" || process.env.CI === "1";

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return user;
    }
  } catch (error) {
    if (allowSessionFallback) {
      console.warn(
        "[auth] getUser() failed. Falling back to cookie session.",
        error,
      );
    }
  }

  if (allowSessionFallback) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  }

  return null;
});
