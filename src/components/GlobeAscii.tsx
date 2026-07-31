import { useTerminalDimensions } from "@opentui/react"
import type { Server } from "../domain"
import { lerpHex } from "../lib/color"
import { isLand } from "../lib/earth"
import { regionLatLng } from "../lib/geo"
import { useClock } from "../state/clock"
import { palette } from "../theme"

const DEG = 180 / Math.PI
const ROTATION_MS = 26000
const LAND = "#6fbf73"
const OCEAN = "#2f6f9e"

const LIGHT = (() => {
  const [x, y, z] = [-0.5, 0.35, 0.79]
  const n = Math.hypot(x, y, z)
  return [x / n, y / n, z / n] as const
})()

interface Cell {
  ch: string
  color: string
}

interface Marker {
  col: number
  row: number
  color: string
}

function shade(base: string, light: number): string {
  const q = Math.max(0, Math.min(1, Math.round((0.14 + 0.86 * Math.max(light, 0)) * 5) / 5))
  return lerpHex(palette.void, base, q)
}

function buildRows(rx: number, ry: number, angle: number): Cell[][] {
  const rows: Cell[][] = []
  for (let r = 0; r < 2 * ry; r++) {
    const y = (r + 0.5 - ry) / ry
    const row: Cell[] = []
    for (let c = 0; c < 2 * rx; c++) {
      const x = (c + 0.5 - rx) / rx
      if (x * x + y * y > 1) {
        row.push({ ch: " ", color: palette.void })
        continue
      }
      const z = Math.sqrt(1 - x * x - y * y)
      const light = x * LIGHT[0] + y * LIGHT[1] + z * LIGHT[2]
      const lat = Math.asin(y) * DEG
      const lon = (Math.atan2(x, z) - angle) * DEG
      row.push({ ch: "█", color: shade(isLand(lat, lon) ? LAND : OCEAN, light) })
    }
    rows.push(row)
  }
  return rows
}

function buildMarkers(servers: Server[], rx: number, ry: number, angle: number): Marker[] {
  const seen = new Map<string, string>()
  for (const s of servers) {
    if (!seen.has(s.region)) {
      const color = s.status === "RUNNING" ? palette.nominal : palette.caution
      seen.set(s.region, color)
    }
  }
  const markers: Marker[] = []
  for (const [region, color] of seen) {
    const [lat0, lng0] = regionLatLng(region)
    const latr = lat0 / DEG
    const lonr = lng0 / DEG + angle
    const x = Math.cos(latr) * Math.sin(lonr)
    const y = Math.sin(latr)
    const z = Math.cos(latr) * Math.cos(lonr)
    if (z <= 0.05) continue
    markers.push({ col: Math.round(rx + x * rx), row: Math.round(ry - y * ry), color })
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

export function GlobeAscii({ servers }: { servers: Server[] }) {
  const now = useClock()
  const { width, height } = useTerminalDimensions()

  const ry = Math.max(6, Math.min(Math.floor((height - 12) / 2), Math.floor((width - 48) / 4)))
  const rx = ry * 2
  const angle = ((now % ROTATION_MS) / ROTATION_MS) * Math.PI * 2

  const rows = buildRows(rx, ry, angle)
  const markers = buildMarkers(servers, rx, ry, angle)

  return (
    <box alignItems="center" justifyContent="center" flexGrow={1}>
      <box position="relative" width={2 * rx} height={2 * ry}>
        <box flexDirection="column">
          {rows.map((cells, i) => (
            <Row key={i} cells={cells} />
          ))}
        </box>
        {markers.map((m, i) => (
          <text key={i} position="absolute" left={m.col} top={m.row} fg={m.color}>
            ◉
          </text>
        ))}
      </box>
    </box>
  )
}
