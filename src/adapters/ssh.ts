import type { CliRenderer } from "@opentui/core"
import { config } from "../config"
import type { Instance } from "../domain"
import { getProvider } from "../providers/registry"

/** `-i <key>` only when a key is configured; otherwise ssh uses its own agent/config. */
const keyArgs = (): string[] => (config.sshKey ? ["-i", config.sshKey] : [])

export async function probeHardened(inst: Instance): Promise<boolean> {
  if (!inst.externalIp) return false
  const proc = Bun.spawn(
    [
      "ssh",
      ...keyArgs(),
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=4",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", "LogLevel=ERROR",
      `${config.deployUser}@${inst.externalIp}`,
      "true",
    ],
    { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
  )
  return (await proc.exited) === 0
}

/** Interactive shell into a vessel via the provider's SSH command (GCP: gcloud
 *  compute ssh, which provisions the key for you). Renderer suspended, like install. */
export async function uplink(renderer: CliRenderer, inst: Instance): Promise<number> {
  const cmd = getProvider().sshCommand(inst)
  renderer.suspend()
  try {
    const proc = Bun.spawn(cmd, { stdin: "inherit", stdout: "inherit", stderr: "inherit" })
    return await proc.exited
  } finally {
    renderer.resume()
  }
}
