import type { CliRenderer } from "@opentui/core"
import { config } from "../config"
import type { Server } from "../domain"

export function sshCommand(server: Server): string | null {
  if (!server.externalIp) return null
  return `ssh -i ${config.sshKey} ${config.deployUser}@${server.externalIp}`
}

export async function uplink(renderer: CliRenderer, server: Server): Promise<number> {
  if (!server.externalIp) throw new Error(`${server.name} has no external IP`)
  renderer.suspend()
  try {
    const proc = Bun.spawn(
      ["ssh", "-i", config.sshKey, `${config.deployUser}@${server.externalIp}`],
      { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
    )
    return await proc.exited
  } finally {
    renderer.resume()
  }
}
