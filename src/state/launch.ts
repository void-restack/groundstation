import { getProvider } from "../providers/registry"
import { getProvisioner } from "../provisioners/registry"
import type { ProvisionEvent, ProvisioningProfile } from "../provisioners/types"
import { cues } from "../audio/cues"
import type { Instance, LaunchPhase, LaunchStep } from "../domain"
import { createStore, useStore } from "../lib/store"
import { fleetSnapshot, logEvent, refreshFleet } from "./fleet"

export interface LaunchSpec {
  name: string
  zone: string
  machineType: string
  imageFamily: string
  imageProject: string
  customCpu?: number
  customMemoryGb?: number
  diskSizeGb?: number
  diskType?: string
  allowHttp: boolean
  allowHttps: boolean
  spot: boolean
  provisioning: ProvisioningProfile
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

function appendLogLines(lines: string[]) {
  const clean = lines.filter((l) => l.trim())
  if (!clean.length) return
  launch.set((s) => ({ ...s, log: [...s.log, ...clean].slice(-MAX_LOG) }))
}

const DONE_RE = /GND-PROVISION-DONE|finished running startup scripts|cloud-init v[^\n]*finished/i

/** Poll the serial console, streaming new output, until the boot config reports done. */
async function waitBootConfig(inst: Instance, timeoutMs = 600000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  let seen = 0
  while (Date.now() < deadline) {
    const out = await getProvider().serialConsole(inst).catch(() => "")
    if (out.length > seen) {
      appendLogLines(out.slice(seen).split("\n"))
      seen = out.length
    }
    if (DONE_RE.test(out)) return true
    await Bun.sleep(6000)
  }
  return false
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
  running = true
  launch.set({ ...initial, phase: "running", target: spec.name })
  logEvent({ server: spec.name, level: "info", message: `creating ${spec.name}` })

  const profile = spec.provisioning
  const provisioner = getProvisioner(profile.kind)

  try {
    pushStep({ name: "create instance", role: "gcloud", state: "running", durationMs: null, detail: null })
    const extra: Record<string, string> = {}
    if (provisioner.injectsAtCreate && provisioner.buildCreatePayload) {
      const { key, value } = provisioner.buildCreatePayload(profile)
      extra[key] = value
    }
    await getProvider().create({
      name: spec.name,
      region: spec.zone,
      zone: spec.zone,
      size: spec.machineType,
      customCpu: spec.customCpu,
      customMemoryGb: spec.customMemoryGb,
      image: `${spec.imageFamily}|${spec.imageProject}`,
      diskSizeGb: spec.diskSizeGb,
      diskType: spec.diskType,
      allowHttp: spec.allowHttp,
      allowHttps: spec.allowHttps,
      spot: spec.spot,
      extra,
    }, appendLog)
    resolveLast("changed")

    pushStep({ name: "wait for boot + network", role: "gcloud", state: "running", durationMs: null, detail: null })
    appendLog("waiting for the instance to reach RUNNING with an external IP…")
    const up = await settle(spec.name)
    resolveLast(up ? "ok" : "failed")
    if (!up) throw new Error("instance did not reach RUNNING with an external IP")

    const inst = fleetSnapshot().find((s) => s.name === spec.name)
    appendLog(`RUNNING${inst?.externalIp ? ` · ${inst.externalIp}` : ""}`)

    if (provisioner.injectsAtCreate) {
      // injected at create, runs at first boot — watch the serial console for it
      pushStep({ name: "run setup (first boot)", role: "provision", state: "running", durationMs: null, detail: null })
      appendLog("reading first-boot output from the serial console…")
      const done = inst ? await waitBootConfig(inst) : false
      resolveLast(done ? "ok" : "changed", done ? undefined : "still running — watch the output")
      launch.set((s) => ({ ...s, phase: "succeeded" }))
      cues.success()
      logEvent({
        server: spec.name,
        level: "ok",
        message: done ? `${spec.name} ready — setup done` : `${spec.name} running — setup still going`,
      })
      return
    }

    if (!provisioner.run) {
      // none → a bare box is the deliverable
      launch.set((s) => ({ ...s, phase: "succeeded" }))
      cues.success()
      logEvent({ server: spec.name, level: "ok", message: `${spec.name} ready` })
      return
    }

    if (!inst) throw new Error("instance vanished before setup")
    const ctx = { instance: inst, profile, provider: getProvider() }

    const tasks = provisioner.plan ? await provisioner.plan(ctx).catch(() => []) : []
    launch.set((s) => ({ ...s, estTotal: tasks.length + 2 }))

    const ok = await provisioner.run(ctx, onEvent)
    launch.set((s) => ({ ...s, phase: ok ? "succeeded" : "failed" }))
    if (ok) cues.success()
    else cues.fail()
    logEvent({
      server: spec.name,
      level: ok ? "ok" : "error",
      message: ok ? `${spec.name} ready` : `${spec.name} setup failed`,
    })
  } catch (err) {
    resolveLast("failed", err instanceof Error ? err.message : String(err))
    launch.set((s) => ({ ...s, phase: "failed" }))
    cues.fail()
    logEvent({ server: spec.name, level: "error", message: `create failed: ${spec.name}` })
  } finally {
    await refreshFleet()
    running = false
  }
}
