import { TextAttributes } from "@opentui/core"
import type { Instance } from "../domain"
import { getProvider } from "../providers/registry"
import { elapsed } from "../lib/format"
import { hardenedVisual, statusVisual } from "../lib/status"
import { useClock } from "../state/clock"
import { glyph, palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={palette.muted}>{label.padEnd(9)}</text>
      <text fg={color ?? palette.text}>{value}</text>
    </box>
  )
}

export function Glass({ instance }: { instance: Instance | null }) {
  const now = useClock()
  if (!instance) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={palette.border}
        title="³ DETAILS"
        titleAlignment="left"
        titleColor={palette.muted}
        alignItems="center"
        justifyContent="center"
      >
        <text fg={palette.muted}>no instance selected</text>
      </box>
    )
  }

  const status = statusVisual(instance.state)
  const chip = hardenedVisual(instance.hardened)
  const ssh = getProvider().sshCommand(instance).join(" ")

  return (
    <box
      flexGrow={1}
      border
      borderStyle="rounded"
      borderColor={palette.border}
      title="³ DETAILS"
      titleAlignment="left"
      titleColor={palette.muted}
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <box flexDirection="row" gap={1} alignItems="center">
        <StatusLamp state={instance.state} />
        <text fg={palette.text} attributes={TextAttributes.BOLD}>
          {instance.name}
        </text>
        <text fg={status.color}>{glyph.sep} {status.label}</text>
      </box>

      <box flexDirection="column">
        <Field label="ZONE" value={instance.zone ?? instance.region} />
        <Field label="MACHINE" value={instance.size} />
        <Field label="EXTERNAL" value={instance.externalIp ?? "—"} color={palette.active} />
        <Field label="INTERNAL" value={instance.internalIp ?? "—"} />
        <Field label="AGE" value={elapsed(instance.createdAt, now)} />
        <Field label="HARDENED" value={chip.text} color={chip.color} />
      </box>

      <box flexGrow={1} />

      <box flexDirection="column">
        <text fg={palette.muted}>SSH</text>
        <text fg={palette.border}>{ssh}</text>
      </box>
    </box>
  )
}
