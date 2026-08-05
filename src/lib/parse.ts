/** Pure parsers for the create form's free-text fields. Kept small and tested. */

/** Split whitespace-separated `k=v` tokens into a map; skips malformed tokens. */
function parseKeyValues(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const tok of s.trim().split(/\s+/)) {
    if (!tok) continue
    const eq = tok.indexOf("=")
    if (eq <= 0) continue
    out[tok.slice(0, eq)] = tok.slice(eq + 1)
  }
  return out
}

/** Parse `k=v k2=v2` into a GCP label map. */
export function parseLabels(s: string): Record<string, string> {
  return parseKeyValues(s)
}

/** Parse `KEY=value KEY2=value2` into an environment map. */
export function parseEnv(s: string): Record<string, string> {
  return parseKeyValues(s)
}

/** Split a whitespace-separated package list into a deduped, trimmed array. */
export function parsePackages(s: string): string[] {
  return [...new Set(s.trim().split(/\s+/).filter(Boolean))]
}

/** True for a valid RFC1123 hostname label (1-63 chars, no leading/trailing hyphen). */
export function validHostname(s: string): boolean {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(s)
}

/** Parse a swap size like `2G`, `512M`, or `2048` into whole megabytes, or null. */
export function parseSwapMb(s: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*([gGmM])?$/.exec(s.trim())
  if (!m) return null
  const n = Number(m[1])
  if (!(n > 0)) return null
  const mb = m[2]?.toLowerCase() === "g" ? n * 1024 : n
  const rounded = Math.round(mb)
  return rounded > 0 ? rounded : null
}
