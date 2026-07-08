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
  return pathname.startsWith("/auth") || pathname.startsWith("/request-access");
}

function applyRouteRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
): NextResponse | null {
  if (process.env.CI) {
    return null;
  }

  const ip = clientIpFromHeaders(request.headers);
  const result = checkRateLimit(`${bucket}:${ip}`, limit, windowMs);
  if (!result.allowed) {
    return new NextResponse("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    });
  }

  return null;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  if (isRateLimitedRoute(pathname)) {
    const rateLimited = applyRouteRateLimit(request, "auth", 30, 5 * 60 * 1000);
    if (rateLimited) {
      return rateLimited;
    }

    const sensitive = applyRouteRateLimit(
      request,
      "auth-sensitive",
      10,
      15 * 60 * 1000,
    );
    if (sensitive) {
      return sensitive;
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

  let user = (await supabase.auth.getUser()).data.user;

  if (!user && process.env.CI === "1") {
    user = (await supabase.auth.getSession()).data.session?.user ?? null;
  }

  if (isProtectedRoute(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
