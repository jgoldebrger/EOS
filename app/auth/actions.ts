"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toSafeAuthError } from "@/lib/auth/errors";

export async function signInWithEmail(input: {
  email: string;
  password: string;
  nextPath?: string;
}): Promise<{ success: false; error: string } | void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { success: false, error: toSafeAuthError(error) };
  }

  const next =
    input.nextPath && input.nextPath.startsWith("/") ? input.nextPath : "/onboarding";
  redirect(next);
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
}): Promise<
  | { success: true; needsConfirmation: true }
  | { success: false; error: string }
  | void
> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { success: false, error: toSafeAuthError(error) };
  }

  if (!data.session) {
    return { success: true, needsConfirmation: true };
  }

  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}
