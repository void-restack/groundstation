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
      return { color: palette.nominal, breathMs: 4000, label: "NOMINAL" }
    case "provisioning":
      return { color: palette.caution, breathMs: 1500, label: "SPINNING UP" }
    case "starting":
      return { color: palette.caution, breathMs: 1500, label: "STARTING" }
    case "repairing":
      return { color: palette.caution, breathMs: 1200, label: "REPAIRING" }
    case "stopping":
      return { color: palette.caution, breathMs: null, label: "STOPPING" }
    case "suspended":
      return { color: palette.static, breathMs: null, label: "SUSPENDED" }
    case "stopped":
      return { color: palette.static, breathMs: null, label: "STOPPED" }
    case "terminated":
      return { color: palette.flare, breathMs: null, label: "TERMINATED" }
    default:
      return { color: palette.static, breathMs: null, label: "UNKNOWN" }
  }
}

export function hardenedVisual(state: HardenedState): { text: string; color: string } {
  switch (state) {
    case "hardened":
      return { text: "⛨ HARD", color: palette.downlink }
    case "soft":
      return { text: "soft", color: palette.caution }
    default:
      return { text: "·····", color: palette.static }
  }
}
