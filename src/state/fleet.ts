import { config } from "../config"
import type { FleetEvent, Server } from "../domain"
import { currentProject, fetchFleet } from "../adapters/gcloud"
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

export async function refreshFleet() {
  try {
    const servers = await fetchFleet()
    fleet.set({ servers, loading: false, error: null, lastSync: new Date() })
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
