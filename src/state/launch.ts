import { getProvider } from "../providers/registry"
import { listTasks, runProvision, type ProvisionEvent } from "../adapters/ansible"
import { capabilities } from "../config"
import { cues } from "../audio/cues"
import type { LaunchPhase, LaunchStep } from "../domain"
import { createStore, useStore } from "../lib/store"
import { fleetSnapshot, logEvent, refreshFleet } from "./fleet"

export interface LaunchSpec {
  name: string
  zone: string
  machineType: string
  imageFamily: string
  imageProject: string
}

interface LaunchState {
  phase: LaunchPhase
  target: string
  steps: LaunchStep[]
  estTotal: number
  log: string[]
}

const initial: LaunchState = { phase: "idle", target: "", steps: [], estTotal: 0, log: [] }
const launch = createStore<LaunchState>(initial)

export const useLaunch = () => useStore(launch)
export const resetLaunch = () => launch.set(initial)
export const launchPhase = () => launch.get().phase

const MAX_LOG = 200
let running = false
let stepStart = 0

function pushStep(step: LaunchStep) {
  stepStart = Date.now()
  launch.set((s) => ({ ...s, steps: [...s.steps, step] }))
}

function resolveLast(state: LaunchStep["state"], detail?: string) {
  const durationMs = Date.now() - stepStart
  launch.set((s) => {
    const steps = s.steps.slice()
    const last = steps.length - 1
    if (last < 0) return s
    steps[last] = { ...steps[last]!, state, durationMs, detail: detail ?? steps[last]!.detail }
    return { ...s, steps }
  })
}

function appendLog(line: string) {
  if (!line.trim()) return
  launch.set((s) => ({ ...s, log: [...s.log, line].slice(-MAX_LOG) }))
}

function onEvent(e: ProvisionEvent) {
  switch (e.type) {
    case "task":
      launch.set((s) => {
        const steps = s.steps.slice()
        const last = steps.length - 1
        if (last >= 0 && steps[last]!.state === "running") {
          steps[last] = { ...steps[last]!, state: "ok", durationMs: Date.now() - stepStart }
        }
        return { ...s, steps }
      })
      pushStep({ name: e.name, role: e.role, state: "running", durationMs: null, detail: null })
      break
    case "result":
      resolveLast(e.state, e.detail)
      if (e.state === "ok" || e.state === "changed") cues.click()
      break
    case "log":
      appendLog(e.line)
      break
  }
}

async function settle(name: string, timeoutMs = 120000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await refreshFleet()
    const inst = fleetSnapshot().find((s) => s.name === name)
    if (inst && inst.state === "running" && inst.externalIp) return true
    await Bun.sleep(4000)
  }
  return false
}

export async function beginLaunch(spec: LaunchSpec) {
  if (running) return
  if (!capabilities.canProvision) {
    logEvent({ server: spec.name, level: "caution", message: "provisioning needs an ansible playbook dir — settings [ , ] → ANSIBLE" })
    return
  }
  running = true
  launch.set({ ...initial, phase: "running", target: spec.name })
  logEvent({ server: spec.name, level: "info", message: `launch sequence: ${spec.name}` })

  try {
    pushStep({ name: "provision vessel", role: "gcloud", state: "running", durationMs: null, detail: null })
    await getProvider().create({
      name: spec.name,
      region: spec.zone,
      zone: spec.zone,
      size: spec.machineType,
      image: `${spec.imageFamily}|${spec.imageProject}`,
    })
    resolveLast("changed")

    pushStep({ name: "await boot + network", role: "gcloud", state: "running", durationMs: null, detail: null })
    const up = await settle(spec.name)
    resolveLast(up ? "ok" : "failed")
    if (!up) throw new Error("vessel did not reach RUNNING with an external IP")

    const tasks = await listTasks(spec.name).catch(() => [])
    launch.set((s) => ({ ...s, estTotal: tasks.length + 2 }))

    const ok = await runProvision(spec.name, onEvent)
    launch.set((s) => ({ ...s, phase: ok ? "succeeded" : "failed" }))
    if (ok) cues.success()
    else cues.fail()
    logEvent({
      server: spec.name,
      level: ok ? "nominal" : "flare",
      message: ok ? `${spec.name} in orbit` : `${spec.name} launch failed`,
    })
  } catch (err) {
    resolveLast("failed", err instanceof Error ? err.message : String(err))
    launch.set((s) => ({ ...s, phase: "failed" }))
    cues.fail()
    logEvent({ server: spec.name, level: "flare", message: `launch aborted: ${spec.name}` })
  } finally {
    await refreshFleet()
    running = false
  }
}
