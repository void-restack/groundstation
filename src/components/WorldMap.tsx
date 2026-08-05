import { useTerminalDimensions } from "@opentui/react"
import type { Instance } from "../domain"
import { regionLatLng } from "../lib/geo"
import { isDaylight, isLand, subsolarLongitude } from "../lib/worldmap"
import { palette } from "../theme"

const LAND_DAY = "#5f887a"
const LAND_NIGHT = "#2c3f3a"

interface Cell {
  ch: string
  color: string
}

interface Marker {
  col: number
  row: number
  color: string
  code: string
}

function landColor(lon: number, subsolar: number): string {
  return isDaylight(lon, subsolar) ? LAND_DAY : LAND_NIGHT
}

function buildRows(w: number, h: number, subsolar: number): Cell[][] {
  const rows: Cell[][] = []
  for (let cy = 0; cy < h; cy++) {
    const row: Cell[] = []
    for (let cx = 0; cx < w; cx++) {
      const lon = -180 + ((cx + 0.5) / w) * 360
      const latTop = 90 - ((cy * 2 + 0.5) / (h * 2)) * 180
      const latBot = 90 - ((cy * 2 + 1.5) / (h * 2)) * 180
      const top = isLand(latTop, lon)
      const bot = isLand(latBot, lon)
      if (!top && !bot) {
        row.push({ ch: " ", color: palette.bg })
        continue
      }
      const color = landColor(lon, subsolar)
      row.push({ ch: top && bot ? "█" : top ? "▀" : "▄", color })
    }
    rows.push(row)
  }
  return rows
}

function buildMarkers(instances: Instance[], w: number, h: number): Marker[] {
  const byRegion = new Map<string, Instance[]>()
  for (const s of instances) {
    const list = byRegion.get(s.region) ?? []
    list.push(s)
    byRegion.set(s.region, list)
  }
  const markers: Marker[] = []
  for (const [region, list] of byRegion) {
    const [lat, lng] = regionLatLng(region)
    const degraded = list.some((s) => s.state !== "running")
    markers.push({
      col: Math.round(((lng + 180) / 360) * (w - 1)),
      row: Math.round(((90 - lat) / 180) * (h - 1)),
      color: degraded ? palette.warn : palette.ok,
      code: region,
    })
  }
  return markers
}

function Row({ cells }: { cells: Cell[] }) {
  const runs: { color: string; text: string }[] = []
  for (const cell of cells) {
    const last = runs[runs.length - 1]
    if (last && last.color === cell.color) last.text += cell.ch
    else runs.push({ color: cell.color, text: cell.ch })
  }
  return (
    <box flexDirection="row">
      {runs.map((run, i) => (
        <text key={i} fg={run.color}>
          {run.text}
        </text>
      ))}
    </box>
  )
}

export function WorldMap({ instances }: { instances: Instance[] }) {
  const { width, height } = useTerminalDimensions()
  const w = Math.max(40, Math.min(width - 48, 130))
  const h = Math.max(12, Math.min(height - 14, 32))
  const subsolar = subsolarLongitude()

  const rows = buildRows(w, h, subsolar)
  const markers = buildMarkers(instances, w, h)

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box position="relative" width={w} height={h}>
        <box flexDirection="column">
          {rows.map((cells, i) => (
            <Row key={i} cells={cells} />
          ))}
        </box>
        {markers.map((m, i) => (
          <box key={i} position="absolute" left={m.col} top={m.row} flexDirection="row">
            <text fg={m.color}>◉</text>
            <text fg={palette.text}> {m.code}</text>
          </box>
        ))}
      </box>
    </box>
  )
}
