import { glyph } from "../theme"

export function sparkline(values: readonly number[], max?: number): string {
  if (values.length === 0) return ""
  const ceiling = max ?? Math.max(...values, 1)
  const bars = glyph.sparkBars
  const last = bars.length - 1
  return values
    .map((v) => {
      const ratio = Math.max(0, Math.min(1, v / ceiling))
      return bars[Math.round(ratio * last)]
    })
    .join("")
}

export function flatline(width: number): string {
  return "┈".repeat(width)
}
