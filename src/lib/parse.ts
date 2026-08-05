/** Pure parsers for the create form's free-text fields. Kept small and tested. */

/** Parse `k=v k2=v2` (whitespace separated) into a label map; skips malformed tokens. */
export function parseLabels(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tok of s.trim().split(/\s+/)) {
    if (!tok) continue
    const eq = tok.indexOf("=")
    if (eq <= 0) continue
    out[tok.slice(0, eq)] = tok.slice(eq + 1)
  }
  return out
}
