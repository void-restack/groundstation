import { TextAttributes } from "@opentui/core"
import { clockLocal, clockUTC } from "../lib/format"
import { getProvider } from "../providers/registry"
import { useClock } from "../state/clock"
import { useProject } from "../state/fleet"
import { glyph, palette } from "../theme"

export function TopBar({ fleetSize }: { fleetSize: number }) {
  useClock()
  const project = useProject()
  const provider = getProvider().id.toUpperCase()
  const now = new Date()
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={palette.panel}
    >
      <box flexDirection="row">
        <text fg={palette.accent} attributes={TextAttributes.BOLD}>
          G
        </text>
        <text fg={palette.text} attributes={TextAttributes.BOLD}>
          ROUNDSTATION
        </text>
        <text fg={palette.muted}> {glyph.sep} fleet of {fleetSize}</text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={palette.active}>{provider}</text>
        <text fg={palette.border}>{glyph.sep}</text>
        <text fg={palette.muted}>{project || "…"}</text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={palette.active}>{clockUTC(now)} UTC</text>
        <text fg={palette.border}>{glyph.sep}</text>
        <text fg={palette.muted}>{clockLocal(now)}</text>
      </box>
    </box>
  )
}
