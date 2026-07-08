const SAFE_RELATIVE_PATH = /^\/(?!\/|\\)/;

/** Allow only same-origin relative paths (blocks protocol-relative //evil.com). */
export function toSafeRelativePath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path) {
    return fallback;
  }

  const trimmed = path.trim();
  if (!SAFE_RELATIVE_PATH.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}
