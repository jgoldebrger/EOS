import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import {
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";

function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/org/") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/request-access")
  );
}

function isRateLimitedRoute(pathname: string): boolean {
  return pathname.startsWith("/auth");
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (isRateLimitedRoute(request.nextUrl.pathname)) {
    const ip = clientIpFromHeaders(request.headers);
    const limit = checkRateLimit(`auth:${ip}`, 30, 5 * 60 * 1000);
    if (!limit.allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: {
          "Retry-After": String(limit.retryAfterSeconds),
        },
      });
    }
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isProtectedRoute(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
