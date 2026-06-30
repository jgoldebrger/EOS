import { Agent, fetch as undiciFetch } from "undici";
import { getSupabaseUrl } from "@/lib/supabase/env";

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return String(input);
}

function isSupabaseRequest(input: RequestInfo | URL): boolean {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) return false;
  return resolveUrl(input).startsWith(supabaseUrl);
}

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function isRetryableNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; cause?: { code?: string } };
  const code = candidate.code ?? candidate.cause?.code;
  return code ? RETRYABLE_NETWORK_CODES.has(code) : false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Corporate SSL inspection (e.g. Fabu network) breaks Node TLS to Supabase.
// Scoped to Supabase host only, development only.
const devInsecureAgent =
  process.env.NODE_ENV === "development"
    ? new Agent({
        connect: { rejectUnauthorized: false },
        connections: 10,
        keepAliveTimeout: 30_000,
        keepAliveMaxTimeout: 60_000,
      })
    : undefined;

const MAX_ATTEMPTS = 3;

async function executeFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (devInsecureAgent && isSupabaseRequest(input)) {
    return undiciFetch(input as string, {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: devInsecureAgent,
    }) as unknown as Response;
  }
  return fetch(input, init);
}

export const supabaseFetch: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      return await executeFetch(input, init);
    } catch (error) {
      lastError = error;
      const canRetry = isRetryableNetworkError(error) && attempt < MAX_ATTEMPTS - 1;

      if (process.env.NODE_ENV === "development" && canRetry) {
        const url = resolveUrl(input);
        console.warn(
          `[supabaseFetch] attempt ${attempt + 1}/${MAX_ATTEMPTS} failed for ${url}:`,
          error,
        );
      }

      if (!canRetry) {
        throw error;
      }

      await sleep(250 * 2 ** attempt);
    }
  }

  throw lastError;
};
