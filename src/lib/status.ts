import type { HardenedState, ServerStatus } from "../domain"
import { palette } from "../theme"

export interface StatusVisual {
  color: string
  breathMs: number | null
  label: string
}

export function statusVisual(status: ServerStatus): StatusVisual {
  switch (status) {
    case "RUNNING":
      return { color: palette.nominal, breathMs: 4000, label: "NOMINAL" }
    case "PROVISIONING":
      return { color: palette.caution, breathMs: 1500, label: "SPINNING UP" }
    case "STAGING":
      return { color: palette.caution, breathMs: 1500, label: "STAGING" }
    case "REPAIRING":
      return { color: palette.caution, breathMs: 1200, label: "REPAIRING" }
    case "STOPPING":
      return { color: palette.caution, breathMs: null, label: "STOPPING" }
    case "SUSPENDED":
      return { color: palette.static, breathMs: null, label: "SUSPENDED" }
    case "TERMINATED":
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
