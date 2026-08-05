import type { FleetEvent } from "../domain"
import { clockLocal } from "../lib/format"
import { glyph, palette } from "../theme"

const LEVEL_COLOR: Record<FleetEvent["level"], string> = {
  info: palette.muted,
  ok: palette.ok,
  warn: palette.warn,
  error: palette.error,
}

export function Ticker({ events }: { events: FleetEvent[] }) {
  return (
    <box
      width={40}
      border
      borderStyle="rounded"
      borderColor={palette.border}
      title="⁴ TICKER"
      titleAlignment="left"
      titleColor={palette.muted}
      flexDirection="column"
    >
      <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
        {events.length === 0 ? (
          <text fg={palette.muted}>no events yet</text>
        ) : (
          events.map((e) => (
            <box key={e.id} flexDirection="row" gap={1}>
              <text fg={palette.border}>{clockLocal(e.at)}</text>
              <text fg={LEVEL_COLOR[e.level]}>{glyph.bullet}</text>
              <text fg={palette.text}>{e.message}</text>
            </box>
          ))
        )}
      </scrollbox>
    </box>
  )
}
