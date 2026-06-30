import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseAuthCookie } from "@/lib/supabase/cookies";

export async function updateSession(request: NextRequest) {
  // Edge middleware cannot use Node TLS overrides for Supabase JWKS/API calls.
  // Read the session cookie set by server actions (which use supabaseFetch).
  const isAuthenticated = hasSupabaseAuthCookie(request.cookies.getAll());

  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/org/") || pathname.startsWith("/onboarding");

  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next({ request });
}
