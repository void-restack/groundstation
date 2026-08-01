import { config } from "../config"
import type { FleetEvent, HardenedState, Instance, InstanceState } from "../domain"
import { getProvider } from "../providers/registry"
import { probeHardened } from "../adapters/ssh"
import { summarizeError } from "../lib/errors"
import { createStore, useStore } from "../lib/store"
import { pushToast } from "./toast"

interface FleetState {
  instances: Instance[]
  loading: boolean
  error: string | null
  lastSync: Date | null
}

const fleet = createStore<FleetState>({
  instances: [],
  loading: true,
  error: null,
  lastSync: null,
})

const events = createStore<FleetEvent[]>([])
const project = createStore<string>("")
const MAX_EVENTS = 200

export function logEvent(e: Omit<FleetEvent, "id" | "at">) {
  events.set((prev) => {
    const next: FleetEvent = { ...e, id: crypto.randomUUID(), at: new Date() }
    return [next, ...prev].slice(0, MAX_EVENTS)
  })
}

const hardenedCache = new Map<string, { state: HardenedState; at: number }>()
const PROBE_TTL = 180000
let probing = false

const applyHardened = (instances: Instance[]): Instance[] =>
  instances.map((s) => ({ ...s, hardened: hardenedCache.get(s.id)?.state ?? "unknown" }))

async function probeFleet(instances: Instance[]) {
  if (probing) return
  probing = true
  const cutoff = Date.now() - PROBE_TTL
  const stale = instances.filter((s) => s.externalIp && (hardenedCache.get(s.id)?.at ?? 0) < cutoff)
  const CONCURRENCY = 4
  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    await Promise.all(
      stale.slice(i, i + CONCURRENCY).map(async (s) => {
        const ok = await probeHardened(s).catch(() => false)
        hardenedCache.set(s.id, { state: ok ? "hardened" : "soft", at: Date.now() })
      }),
    )
    fleet.set((prev) => ({ ...prev, instances: applyHardened(prev.instances) }))
  }
  probing = false
}

let prevState: Map<string, { state: InstanceState; name: string }> | null = null

function diffAndLog(instances: Instance[]) {
  const next = new Map(instances.map((s) => [s.id, { state: s.state, name: s.name }]))
  if (prevState === null) {
    prevState = next
    return
  }
  for (const s of instances) {
    const prev = prevState.get(s.id)
    if (!prev) {
      logEvent({ server: s.name, level: "nominal", message: "vessel appeared" })
    } else if (prev.state !== s.state) {
      const level = s.state === "running" ? "nominal" : s.state === "terminated" ? "flare" : "caution"
      logEvent({ server: s.name, level, message: `${prev.state} → ${s.state}` })
    }
  }
  for (const [id, prev] of prevState) {
    if (!next.has(id)) logEvent({ server: prev.name, level: "caution", message: "vessel gone" })
  }
  prevState = next
}

export async function refreshFleet() {
  try {
    const instances = applyHardened(await getProvider().listInstances())
    diffAndLog(instances)
    fleet.set({ instances, loading: false, error: null, lastSync: new Date() })
    void probeFleet(instances)
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    const changed = raw !== fleet.get().error
    fleet.set((prev) => ({ ...prev, loading: false, error: raw }))
    // toast only when the error changes, so a persistently-failing poll
    // (e.g. expired auth every 15s) doesn't spam identical cards
    if (changed) {
      const { title, message } = summarizeError(raw)
      pushToast({ title, message, variant: "error" })
    }
  }
}

let poller: ReturnType<typeof setInterval> | null = null

export function startFleetPolling() {
  if (poller) return
  void refreshFleet()
  void getProvider()
    .account()
    .then((a) => project.set(a.value))
    .catch(() => {})
  poller = setInterval(() => void refreshFleet(), config.pollIntervalMs)
  poller.unref?.()
}

export const useFleet = () => useStore(fleet)
export const useEvents = () => useStore(events)
export const useProject = () => useStore(project)
export const fleetSnapshot = () => fleet.get().instances
