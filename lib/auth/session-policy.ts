import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AuthClient = SupabaseClient<Database>;

/**
 * Resolve the signed-in user for edge middleware.
 * Production: validates JWT via getUser() (fail-closed).
 * CI: falls back to cookie session when getUser() is unavailable.
 */
export async function resolveMiddlewareSessionUser(
  supabase: AuthClient,
): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return user;
  }

  if (process.env.CI === "1") {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
  }

  return null;
}
