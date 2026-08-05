import type { HardenedState, InstanceState } from "../domain"
import { palette } from "../theme"

export interface StatusVisual {
  color: string
  breathMs: number | null
  label: string
}

export function statusVisual(state: InstanceState): StatusVisual {
  switch (state) {
    case "running":
      return { color: palette.ok, breathMs: 4000, label: "NOMINAL" }
    case "provisioning":
      return { color: palette.warn, breathMs: 1500, label: "SPINNING UP" }
    case "starting":
      return { color: palette.warn, breathMs: 1500, label: "STARTING" }
    case "repairing":
      return { color: palette.warn, breathMs: 1200, label: "REPAIRING" }
    case "stopping":
      return { color: palette.warn, breathMs: null, label: "STOPPING" }
    case "suspended":
      return { color: palette.muted, breathMs: null, label: "SUSPENDED" }
    case "stopped":
      return { color: palette.muted, breathMs: null, label: "STOPPED" }
    case "terminated":
      return { color: palette.error, breathMs: null, label: "TERMINATED" }
    default:
      return { color: palette.muted, breathMs: null, label: "UNKNOWN" }
  }
}

export function hardenedVisual(state: HardenedState): { text: string; color: string } {
  switch (state) {
    case "hardened":
      return { text: "⛨ HARD", color: palette.active }
    case "soft":
      return { text: "soft", color: palette.warn }
    default:
      return { text: "·····", color: palette.muted }
  }
}
