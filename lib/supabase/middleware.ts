import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { resolveMiddlewareSessionUser } from "@/lib/auth/session-policy";
import { buildContentSecurityPolicy } from "@/lib/security/csp";
import { checkDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { clientIpFromHeaders } from "@/lib/security/rate-limit";

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

async function applyRouteRateLimit(
  request: NextRequest,
  bucket: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  if (process.env.CI) {
    return null;
  }

  const ip = clientIpFromHeaders(request.headers);
  const result = await checkDistributedRateLimit(`${bucket}:${ip}`, limit, windowMs);
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

function applySecurityHeaders(response: NextResponse, nonce: string) {
  response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  response.headers.set("x-nonce", nonce);
}

export async function updateSession(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const { pathname } = request.nextUrl;

  if (isRateLimitedRoute(pathname)) {
    const rateLimited = await applyRouteRateLimit(request, "auth", 30, 5 * 60 * 1000);
    if (rateLimited) {
      applySecurityHeaders(rateLimited, nonce);
      return rateLimited;
    }

    const sensitive = await applyRouteRateLimit(
      request,
      "auth-sensitive",
      10,
      15 * 60 * 1000,
    );
    if (sensitive) {
      applySecurityHeaders(sensitive, nonce);
      return sensitive;
    }
  }

  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    applySecurityHeaders(response, nonce);
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const user = await resolveMiddlewareSessionUser(supabase);

  if (isProtectedRoute(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    applySecurityHeaders(redirectResponse, nonce);
    return redirectResponse;
  }

  applySecurityHeaders(response, nonce);
  return response;
}
