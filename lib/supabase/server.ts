import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { supabaseFetch } from "@/lib/supabase/fetch";

const DB_METHODS = new Set(["from", "rpc", "schema", "storage"]);

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

function createServiceClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    {
      global: { fetch: supabaseFetch },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
}

/**
 * Server Supabase client: auth via user session cookies (GoTrue / ES256),
 * database via service role (PostgREST cannot verify ES256 user JWTs on new projects).
 * Never expose to the browser.
 */
export const createClient = cache(async (): Promise<SupabaseClient<Database>> => {
  const auth = await createAuthClient();
  const db = createServiceClient();

  return new Proxy(auth, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && DB_METHODS.has(prop)) {
        const value = Reflect.get(db, prop, db);
        return typeof value === "function"
          ? (value as (...args: unknown[]) => unknown).bind(db)
          : value;
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as SupabaseClient<Database>;
});

/** One auth lookup per request — avoids repeated getUser() round trips. */
export const getServerSessionUser = cache(async () => {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return user;
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[auth] getUser() failed (network/TLS to Supabase). Falling back to cookie session.",
        error,
      );
    }
  }

  // Cookie session avoids a GoTrue round trip when corporate network drops TLS.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
});
