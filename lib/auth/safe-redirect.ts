const SAFE_RELATIVE_PATH = /^\/(?!\/|\\)/;
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

function normalizeRedirectPath(path: string): string {
  let value = path.trim();

  try {
    value = decodeURIComponent(value);
  } catch {
    return "";
  }

  return value;
}

/** Allow only same-origin relative paths (blocks protocol-relative //evil.com). */
export function toSafeRelativePath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path) {
    return fallback;
  }

  const trimmed = normalizeRedirectPath(path);
  if (
    !trimmed ||
    trimmed.includes("\\") ||
    CONTROL_CHARS.test(trimmed) ||
    !SAFE_RELATIVE_PATH.test(trimmed)
  ) {
    return fallback;
  }

  return trimmed;
}
