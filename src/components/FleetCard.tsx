import { TextAttributes } from "@opentui/core"
import type { Instance } from "../domain"
import { glyph, palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

const pad = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s.padEnd(n))

export function FleetCard({ instance, selected }: { instance: Instance; selected: boolean }) {
  return (
    <box flexDirection="row" height={1} backgroundColor={selected ? palette.raised : undefined}>
      <text fg={selected ? palette.active : palette.bg}>▎</text>
      <StatusLamp state={instance.state} />
      <text> </text>
      <text
        fg={selected ? palette.text : palette.muted}
        attributes={selected ? TextAttributes.BOLD : undefined}
      >
        {pad(instance.name, 14)}
      </text>
      <text fg={palette.muted}>{pad(instance.zone ?? instance.region, 15)}</text>
      <text fg={palette.border}>{pad(instance.size, 9)}</text>
      <text fg={palette.active}>{instance.hardened === "hardened" ? glyph.hardened : " "}</text>
    </box>
  )
}
