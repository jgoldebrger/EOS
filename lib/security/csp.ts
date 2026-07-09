const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

export function buildContentSecurityPolicy(nonce?: string): string {
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const connectSrc = ["'self'", supabaseOrigin, "https://api.resend.com"].filter(Boolean);

  if (supabaseOrigin) {
    const supabaseHost = new URL(supabaseOrigin).host;
    connectSrc.push(`wss://${supabaseHost}`);
  }

  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = isProduction && nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "'self' 'unsafe-inline'";
  const styleSrc = isProduction && nonce
    ? `'self' 'nonce-${nonce}'`
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    "object-src 'none'",
    `connect-src ${connectSrc.join(" ")}`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: blob:" + (supabaseOrigin ? ` ${supabaseOrigin}` : ""),
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ]
    .filter(Boolean)
    .join("; ");
}
