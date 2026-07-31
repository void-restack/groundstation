import { config } from "../config"
import { exec, streamLines } from "./exec"

export type ProvisionEvent =
  | { type: "play"; name: string }
  | { type: "task"; name: string; role: string | null }
  | { type: "result"; state: "ok" | "changed" | "skipped" | "failed"; host: string; detail?: string }
  | { type: "recap"; failures: number }
  | { type: "log"; line: string }

const ANSIBLE_ENV = { ANSIBLE_FORCE_COLOR: "0", ANSIBLE_NOCOLOR: "1", PY_COLORS: "0" }

const RE_TASK = /^(?:TASK|RUNNING HANDLER) \[(.+?)\]/
const RE_PLAY = /^PLAY \[(.+?)\]/
const RE_RESULT = /^(ok|changed|skipping|failed|fatal): \[([^\]]+)\]/
const RE_RECAP = /^PLAY RECAP/

function splitRole(label: string): { role: string | null; name: string } {
  const idx = label.indexOf(" : ")
  return idx === -1
    ? { role: null, name: label }
    : { role: label.slice(0, idx), name: label.slice(idx + 3) }
}

export function parseLine(line: string): ProvisionEvent | null {
  const play = RE_PLAY.exec(line)
  if (play) return { type: "play", name: play[1]! }

  const task = RE_TASK.exec(line)
  if (task) return { type: "task", ...splitRole(task[1]!) }

  const result = RE_RESULT.exec(line)
  if (result) {
    const kind = result[1]!
    const state = kind === "fatal" ? "failed" : kind === "skipping" ? "skipped" : kind
    return { type: "result", state: state as "ok" | "changed" | "skipped" | "failed", host: result[2]! }
  }

  if (RE_RECAP.test(line)) return { type: "recap", failures: 0 }
  return { type: "log", line }
}

export async function listTasks(target: string): Promise<string[]> {
  const { stdout, code } = await exec(
    ["ansible-playbook", config.provisionPlaybook, "-e", `target=${target}`, "--list-tasks"],
    config.ansibleDir,
  )
  if (code !== 0) return []
  const tasks: string[] = []
  for (const raw of stdout.split("\n")) {
    const m = /^\s{4,}(\S.*?)\s+TAGS:\s*\[/.exec(raw)
    if (m && !raw.trimStart().startsWith("play #")) tasks.push(m[1]!)
  }
  return tasks
}

export function runProvision(
  target: string,
  onEvent: (e: ProvisionEvent) => void,
): Promise<boolean> {
  return streamLines(
    [
      "ansible-playbook",
      config.provisionPlaybook,
      "-e",
      `target=${target}`,
      "-e",
      `ansible_user=${config.bootstrapUser}`,
    ],
    (line) => onEvent(parseLine(line) ?? { type: "log", line }),
    { cwd: config.ansibleDir, env: ANSIBLE_ENV },
  ).then((codeCbk) => codeCbk === 0)
}

export function runUpdateAll(onEvent: (e: ProvisionEvent) => void): Promise<boolean> {
  return streamLines(
    ["ansible-playbook", config.updatePlaybook],
    (line) => onEvent(parseLine(line) ?? { type: "log", line }),
    { cwd: config.ansibleDir, env: ANSIBLE_ENV },
  ).then((code) => code === 0)
}
