/**
 * Extracts the numeric suffix from the highest existing docNo starting with `prefix`
 * (docNo format: `<PREFIX><4-digit suffix>`, e.g. `MI-20260707-0011` -> 11).
 * String ordering matches numeric ordering here since the suffix is always zero-padded
 * to a fixed width. Returns 0 if no matching docNo exists yet.
 */
export function extractDocNoSuffix(docNo: string, prefix: string): number {
  return Number(docNo.slice(prefix.length)) || 0;
}
