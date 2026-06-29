import type { User } from "@supabase/supabase-js";

export async function requireUser(): Promise<User> {
  throw new Error("requireUser: not implemented (Wave 1b)");
}
