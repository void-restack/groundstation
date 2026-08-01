import type { CliRenderer } from "@opentui/core"
import { getProvider } from "../providers/registry"

/**
 * Run the active provider's interactive auth command (e.g. `gcloud auth login`)
 * in the real terminal — renderer suspended, like uplink — so the browser/device
 * flow works. Caller re-detects / refreshes afterwards.
 */
export async function reauth(renderer: CliRenderer): Promise<number> {
  const cmd = getProvider().authCommand()
  renderer.suspend()
  try {
    const proc = Bun.spawn(cmd, { stdin: "inherit", stdout: "inherit", stderr: "inherit" })
    return await proc.exited
  } finally {
    renderer.resume()
  }
}
