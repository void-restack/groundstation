import type { FleetEvent } from "../domain"
import { clockLocal } from "../lib/format"
import { glyph, palette } from "../theme"

const LEVEL_COLOR: Record<FleetEvent["level"], string> = {
  info: palette.static,
  nominal: palette.nominal,
  caution: palette.caution,
  flare: palette.flare,
}

export function Ticker({ events }: { events: FleetEvent[] }) {
  return (
    <box
      width={40}
      border
      borderStyle="rounded"
      borderColor={palette.hairline}
      title=" EVENT TICKER "
      titleAlignment="center"
      flexDirection="column"
    >
      <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
        {events.length === 0 ? (
          <text fg={palette.static}>quiet skies</text>
        ) : (
          events.map((e) => (
            <box key={e.id} flexDirection="row" gap={1}>
              <text fg={palette.hairline}>{clockLocal(e.at)}</text>
              <text fg={LEVEL_COLOR[e.level]}>{glyph.bullet}</text>
              <text fg={palette.starlight}>{e.message}</text>
            </box>
          ))
        )}
      </scrollbox>
    </box>
  )
}
