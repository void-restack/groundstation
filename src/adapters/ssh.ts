import type { CliRenderer } from "@opentui/core"
import { config } from "../config"
import type { Instance } from "../domain"

/** `-i <key>` only when a key is configured; otherwise ssh uses its own agent/config. */
const keyArgs = (): string[] => (config.sshKey ? ["-i", config.sshKey] : [])

export function sshCommand(inst: Instance): string | null {
  if (!inst.externalIp) return null
  const key = config.sshKey ? `-i ${config.sshKey} ` : ""
  return `ssh ${key}${config.deployUser}@${inst.externalIp}`
}

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

export async function uplink(renderer: CliRenderer, inst: Instance): Promise<number> {
  if (!inst.externalIp) throw new Error(`${inst.name} has no external IP`)
  renderer.suspend()
  try {
    const proc = Bun.spawn(
      ["ssh", ...keyArgs(), `${config.deployUser}@${inst.externalIp}`],
      { stdin: "inherit", stdout: "inherit", stderr: "inherit" },
    )
    return await proc.exited
  } finally {
    renderer.resume()
  }
}
