import { TextAttributes } from "@opentui/core"
import type { Instance } from "../domain"
import { glyph, palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n))

export function FleetCard({ instance, selected }: { instance: Instance; selected: boolean }) {
  return (
    <box flexDirection="row" height={1} backgroundColor={selected ? palette.raised : undefined}>
      <text fg={selected ? palette.downlink : palette.void}>▎</text>
      <StatusLamp state={instance.state} />
      <text> </text>
      <text
        fg={selected ? palette.starlight : palette.static}
        attributes={selected ? TextAttributes.BOLD : undefined}
      >
        {pad(instance.name, 16)}
      </text>
      <text fg={palette.static}> {pad(instance.flightCode, 6)} </text>
      <text fg={palette.hairline}>{pad(instance.size, 11)}</text>
      <text fg={palette.downlink}>{instance.hardened === "hardened" ? glyph.hardened : " "}</text>
    </box>
  )
}
