import { TextAttributes } from "@opentui/core"
import type { Server } from "../domain"
import { palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n))

export function FleetCard({ server, selected }: { server: Server; selected: boolean }) {
  return (
    <box flexDirection="row" height={1} backgroundColor={selected ? palette.raised : undefined}>
      <text fg={selected ? palette.downlink : palette.void}>▎</text>
      <StatusLamp status={server.status} />
      <text> </text>
      <text
        fg={selected ? palette.starlight : palette.static}
        attributes={selected ? TextAttributes.BOLD : undefined}
      >
        {pad(server.name, 16)}
      </text>
      <text fg={palette.static}> {pad(server.flightCode, 6)} </text>
      <text fg={palette.hairline}>{pad(server.machineType, 12)}</text>
    </box>
  )
}
