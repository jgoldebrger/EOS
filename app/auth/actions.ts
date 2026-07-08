"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeAuthError } from "@/lib/auth/errors";
import { isPublicSignupEnabled } from "@/lib/auth/platform-access";
import { toSafeRelativePath } from "@/lib/auth/safe-redirect";
import { buildFullName } from "@/lib/users/display-name";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  nextPath: z.string().optional(),
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
});

export async function signInWithEmail(input: {
  email: string;
  password: string;
  nextPath?: string;
}): Promise<{ success: false; error: string } | void> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sign-in details",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: toSafeAuthError(error) };
  }

  const next = toSafeRelativePath(parsed.data.nextPath, "/onboarding");
  redirect(next);
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<
  | { success: true; needsConfirmation: true }
  | { success: false; error: string }
  | void
> {
  if (!isPublicSignupEnabled()) {
    return {
      success: false,
      error: "Public sign-up is disabled. Ask an administrator for an invitation.",
    };
  }

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sign-up details",
    };
  }

  const supabase = await createClient();
  const fullName = buildFullName(parsed.data.firstName, parsed.data.lastName);

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        full_name: fullName,
      },
    },
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
