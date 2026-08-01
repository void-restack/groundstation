import { useKeyboard } from "@opentui/react"
import { StatusLamp } from "../components/StatusLamp"
import { WorldMap } from "../components/WorldMap"
import type { Instance } from "../domain"
import { flightCode } from "../lib/format"
import { useFleet } from "../state/fleet"
import { setScreen } from "../state/ui"
import { glyph, palette } from "../theme"

function groupByRegion(instances: Instance[]): Map<string, Instance[]> {
  const map = new Map<string, Instance[]>()
  for (const s of instances) {
    const list = map.get(s.region) ?? []
    list.push(s)
    map.set(s.region, list)
  }
  return map
}

export function Orbit() {
  const { instances } = useFleet()
  useKeyboard((key) => {
    if (key.name === "escape" || key.name === "o") setScreen("board")
  })

  const regions = [...groupByRegion(instances).entries()].sort((a, b) => b[1].length - a[1].length)
  const top = regions[0]
  const concentration = top && instances.length > 1 && top[1].length / instances.length >= 0.6

  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.void}>
      <text fg={palette.beacon}>ORBIT {glyph.sep} constellation by region</text>

      {concentration && top ? (
        <text fg={palette.caution}>
          ⚠ {top[1].length} of {instances.length} vessels share {top[0]} {glyph.sep} correlated-failure risk
        </text>
      ) : null}

      <box flexDirection="row" flexGrow={1} gap={2} marginTop={1}>
        <box
          flexGrow={1}
          border
          borderStyle="rounded"
          borderColor={palette.hairline}
          title="⁵ WORLD"
          titleAlignment="left"
          titleColor={palette.static}
        >
          <WorldMap instances={instances} />
        </box>

        <box
          width={38}
          border
          borderStyle="rounded"
          borderColor={palette.hairline}
          title=" REGIONS "
          titleAlignment="center"
          padding={1}
          flexDirection="column"
          gap={1}
        >
          {regions.map(([region, list]) => (
            <box key={region} flexDirection="column">
              <text fg={palette.downlink}>{region} ({list.length})</text>
              {list.map((s) => (
                <box key={s.id} flexDirection="row" gap={1}>
                  <StatusLamp state={s.state} />
                  <text fg={palette.starlight}>{s.name}</text>
                  <box flexGrow={1} />
                  <text fg={palette.static}>{flightCode(s.zone ?? "")}</text>
                </box>
              ))}
            </box>
          ))}
        </box>
      </box>

      <text fg={palette.static}>[esc] return to board</text>
    </box>
  )
}
