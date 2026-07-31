import { TextAttributes } from "@opentui/core"
import type { Server } from "../domain"
import { hardenedVisual } from "../lib/status"
import { glyph, palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s)

export function FleetCard({ server, selected }: { server: Server; selected: boolean }) {
  const chip = hardenedVisual(server.hardened)
  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={selected ? palette.raised : undefined}
    >
      <text fg={selected ? palette.downlink : palette.void}>▎</text>
      <box flexDirection="column" flexGrow={1}>
        <box flexDirection="row" gap={1}>
          <StatusLamp status={server.status} />
          <text
            fg={selected ? palette.starlight : palette.static}
            attributes={selected ? TextAttributes.BOLD : undefined}
          >
            {truncate(server.name, 22)}
          </text>
        </box>
        <box flexDirection="row" gap={1}>
          <text fg={palette.static}>{server.flightCode}</text>
          <text fg={palette.hairline}>{glyph.sep}</text>
          <text fg={palette.static}>{server.machineType}</text>
        </box>
      </box>
      <text fg={chip.color}>{chip.text}</text>
    </box>
  )
}
