import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getServerSessionUser } from "@/lib/supabase/server";

export async function requireUser(): Promise<User> {
  const user = await getServerSessionUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}
