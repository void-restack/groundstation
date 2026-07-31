import { config } from "../config"
import type { FleetEvent, HardenedState, Server, ServerStatus } from "../domain"
import { currentProject, fetchFleet } from "../adapters/gcloud"
import { probeHardened } from "../adapters/ssh"
import { createStore, useStore } from "../lib/store"

interface FleetState {
  servers: Server[]
  loading: boolean
  error: string | null
  lastSync: Date | null
}

const fleet = createStore<FleetState>({
  servers: [],
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

const applyHardened = (servers: Server[]): Server[] =>
  servers.map((s) => ({ ...s, hardened: hardenedCache.get(s.id)?.state ?? "unknown" }))

async function probeFleet(servers: Server[]) {
  if (probing) return
  probing = true
  const cutoff = Date.now() - PROBE_TTL
  const stale = servers.filter((s) => s.externalIp && (hardenedCache.get(s.id)?.at ?? 0) < cutoff)
  const CONCURRENCY = 4
  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    await Promise.all(
      stale.slice(i, i + CONCURRENCY).map(async (s) => {
        const ok = await probeHardened(s).catch(() => false)
        hardenedCache.set(s.id, { state: ok ? "hardened" : "soft", at: Date.now() })
      }),
    )
    fleet.set((prev) => ({ ...prev, servers: applyHardened(prev.servers) }))
  }
  probing = false
}

let prevStatus: Map<string, { status: ServerStatus; name: string }> | null = null

function diffAndLog(servers: Server[]) {
  const next = new Map(servers.map((s) => [s.id, { status: s.status, name: s.name }]))
  if (prevStatus === null) {
    prevStatus = next
    return
  }
  for (const s of servers) {
    const prev = prevStatus.get(s.id)
    if (!prev) {
      logEvent({ server: s.name, level: "nominal", message: "vessel appeared" })
    } else if (prev.status !== s.status) {
      const level = s.status === "RUNNING" ? "nominal" : s.status === "TERMINATED" ? "flare" : "caution"
      logEvent({ server: s.name, level, message: `${prev.status.toLowerCase()} → ${s.status.toLowerCase()}` })
    }
  }
  for (const [id, prev] of prevStatus) {
    if (!next.has(id)) logEvent({ server: prev.name, level: "caution", message: "vessel gone" })
  }
  prevStatus = next
}

export async function refreshFleet() {
  try {
    const servers = applyHardened(await fetchFleet())
    diffAndLog(servers)
    fleet.set({ servers, loading: false, error: null, lastSync: new Date() })
    void probeFleet(servers)
  } catch (err) {
    fleet.set((prev) => ({
      ...prev,
      loading: false,
      error: err instanceof Error ? err.message : String(err),
    }))
  }
}

let poller: ReturnType<typeof setInterval> | null = null

export function startFleetPolling() {
  if (poller) return
  void refreshFleet()
  void currentProject()
    .then((p) => project.set(p))
    .catch(() => {})
  poller = setInterval(() => void refreshFleet(), config.pollIntervalMs)
  poller.unref?.()
}

export const useFleet = () => useStore(fleet)
export const useEvents = () => useStore(events)
export const useProject = () => useStore(project)
export const fleetSnapshot = () => fleet.get().servers
