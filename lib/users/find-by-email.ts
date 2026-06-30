import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthUserByEmail {
  id: string;
  email: string;
}

/** Looks up an auth user by email via the Admin API. Server-only. */
export async function findAuthUserByEmail(
  email: string,
): Promise<AuthUserByEmail | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const admin = createAdminClient();
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data.users.length) {
      return null;
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (match?.id && match.email) {
      return { id: match.id, email: match.email };
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}
