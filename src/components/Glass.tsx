import { TextAttributes } from "@opentui/core"
import { sshCommand } from "../adapters/ssh"
import type { Server } from "../domain"
import { elapsed } from "../lib/format"
import { hardenedVisual, statusVisual } from "../lib/status"
import { useClock } from "../state/clock"
import { glyph, palette } from "../theme"
import { StatusLamp } from "./StatusLamp"

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={palette.static}>{label.padEnd(9)}</text>
      <text fg={color ?? palette.starlight}>{value}</text>
    </box>
  )
}

export function Glass({ server }: { server: Server | null }) {
  const now = useClock()
  if (!server) {
    return (
      <box
        flexGrow={1}
        border
        borderStyle="rounded"
        borderColor={palette.hairline}
        title="³ THE GLASS"
        titleAlignment="left"
        titleColor={palette.static}
        alignItems="center"
        justifyContent="center"
      >
        <text fg={palette.static}>no vessel selected</text>
      </box>
    )
  }

  const status = statusVisual(server.status)
  const chip = hardenedVisual(server.hardened)
  const ssh = sshCommand(server)

  return (
    <box
      flexGrow={1}
      border
      borderStyle="rounded"
      borderColor={palette.hairline}
      title="³ THE GLASS"
      titleAlignment="left"
      titleColor={palette.static}
      padding={1}
      flexDirection="column"
      gap={1}
    >
      <box flexDirection="row" gap={1} alignItems="center">
        <StatusLamp status={server.status} />
        <text fg={palette.starlight} attributes={TextAttributes.BOLD}>
          {server.name}
        </text>
        <text fg={status.color}>{glyph.sep} {status.label}</text>
      </box>

      <box flexDirection="column">
        <Field label="REGION" value={`${server.region}  ${server.flightCode}`} />
        <Field label="MACHINE" value={server.machineType} />
        <Field label="EXTERNAL" value={server.externalIp ?? "—"} color={palette.downlink} />
        <Field label="INTERNAL" value={server.internalIp ?? "—"} />
        <Field label="MET" value={elapsed(server.createdAt, now)} />
        <Field label="HARDENED" value={chip.text} color={chip.color} />
      </box>

      <box flexGrow={1} />

      {ssh ? (
        <box flexDirection="column">
          <text fg={palette.static}>UPLINK</text>
          <text fg={palette.hairline}>{ssh}</text>
        </box>
      ) : null}
    </box>
  )
}
