import { getSupabaseUrl } from "@/lib/supabase/env";

export function getSupabaseProjectRef(): string | null {
  const url = getSupabaseUrl();
  if (!url) return null;
  try {
    return new URL(url).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}

export function hasSupabaseAuthCookie(
  cookies: { name: string; value: string }[],
): boolean {
  const ref = getSupabaseProjectRef();
  if (!ref) return false;

  const prefix = `sb-${ref}-auth-token`;
  return cookies.some(
    (cookie) =>
      (cookie.name === prefix || cookie.name.startsWith(`${prefix}.`)) &&
      cookie.value.length > 0,
  );
}
