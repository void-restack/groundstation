/**
 * Turn a raw tool error (often a multi-line gcloud dump) into a short,
 * actionable toast message. Recognises the common gcloud failure modes and
 * points at the fix instead of pasting the whole stderr into the UI.
 */
export function summarizeError(raw: string): { title: string; message: string } {
  const text = (raw ?? "").trim()
  if (!text) return { title: "error", message: "unknown error" }

  if (/reauthentication failed|invalid_grant|refreshing your current auth|auth.*token|gcloud auth login/i.test(text)) {
    return { title: "gcloud auth expired", message: "run  gcloud auth login  to reconnect the fleet" }
  }
  if (/gcloud/i.test(text) && /command not found|not found|no such file|enoent/i.test(text)) {
    return { title: "gcloud not found", message: "install the Google Cloud SDK — settings ( , ) → tools" }
  }
  if (/do not have permission|permission denied|forbidden|403/i.test(text)) {
    return { title: "permission denied", message: "your account can't list this project's instances" }
  }

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const errLine = lines.find((l) => /^ERROR:/i.test(l)) ?? lines[0]!
  const cleaned = errLine.replace(/^ERROR:\s*/i, "").replace(/^\([^)]*\)\s*/, "").trim()
  const message = cleaned.length > 180 ? `${cleaned.slice(0, 177)}…` : cleaned
  return { title: "fleet error", message }
}
