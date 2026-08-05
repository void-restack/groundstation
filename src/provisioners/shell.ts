import { readFileSync } from "fs"
import { streamLines } from "../adapters/exec"
import { expandHome } from "../config"
import type { ProvisionContext, ProvisionEvent, Provisioner } from "./types"

/** SSH into the instance and run a script over stdin, streaming each line as a log event. */
async function runRemote(
  ctx: ProvisionContext,
  script: string,
  onEvent: (e: ProvisionEvent) => void,
): Promise<boolean> {
  const target = ctx.provider.sshTarget(ctx.instance)
  if (!target) {
    onEvent({ type: "log", line: "no reachable ssh target (instance has no external IP)" })
    return false
  }
  const idArgs = target.identityFile ? ["-i", target.identityFile] : []
  const code = await streamLines(
    [
      "ssh",
      ...idArgs,
      "-o", "BatchMode=yes",
      "-o", "StrictHostKeyChecking=accept-new",
      "-o", "UserKnownHostsFile=/dev/null",
      `${target.user}@${target.host}`,
      "bash -s",
    ],
    (line) => onEvent({ type: "log", line }),
    { stdin: script },
  )
  return code === 0
}

export const shell: Provisioner = {
  kind: "shell",
  label: "shell script",
  requiresTool: "ssh",
  injectsAtCreate: false,
  async run(ctx, onEvent) {
    const path = expandHome(ctx.profile.script ?? "")
    if (!path) {
      onEvent({ type: "log", line: "shell profile needs a script path" })
      return false
    }
    let script: string
    try {
      script = readFileSync(path, "utf8")
    } catch {
      onEvent({ type: "log", line: `script not found: ${ctx.profile.script}` })
      return false
    }
    onEvent({ type: "task", name: `run ${ctx.profile.script}`, role: "shell" })
    const ok = await runRemote(ctx, script, onEvent)
    onEvent({ type: "result", state: ok ? "changed" : "failed", host: ctx.instance.name })
    return ok
  },
}

export const command: Provisioner = {
  kind: "command",
  label: "remote command",
  requiresTool: "ssh",
  injectsAtCreate: false,
  async run(ctx, onEvent) {
    const cmd = ctx.profile.command
    if (!cmd) {
      onEvent({ type: "log", line: "command profile needs a command" })
      return false
    }
    onEvent({ type: "task", name: cmd, role: "command" })
    const ok = await runRemote(ctx, cmd, onEvent)
    onEvent({ type: "result", state: ok ? "changed" : "failed", host: ctx.instance.name })
    return ok
  },
}
