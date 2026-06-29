/** Date utilities for EOS cadences — implemented in feature waves. */

export function formatCadenceDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}
