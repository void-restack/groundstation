import type { CliRenderer } from "@opentui/core"
import { config } from "../config"
import type { Server } from "../domain"

export function sshCommand(server: Server): string | null {
  if (!server.externalIp) return null
  return `ssh -i ${config.sshKey} ${config.deployUser}@${server.externalIp}`
}

export async function probeHardened(server: Server): Promise<boolean> {
  if (!server.externalIp) return false
  const proc = Bun.spawn(
    [
      "ssh",
      "-i", config.sshKey,
      "-o", "BatchMode=yes",
      "-o", "ConnectTimeout=4",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "UserKnownHostsFile=/dev/null",
      "-o", "LogLevel=ERROR",
      `${config.deployUser}@${server.externalIp}`,
      "true",
    ],
    { stdin: "ignore", stdout: "ignore", stderr: "ignore" },
  )
  return (await proc.exited) === 0
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
