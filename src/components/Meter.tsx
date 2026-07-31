import { lerpHex } from "../lib/color"
import { gradientAt } from "../lib/gradient"
import { glyph, meterGradient, palette } from "../theme"

export function Meter({
  value,
  width = 16,
  gradient = meterGradient,
}: {
  value: number
  width?: number
  gradient?: readonly string[]
}) {
  const v = Math.max(0, Math.min(1, value))
  const filled = v * width
  const full = Math.floor(filled)
  const blocks = glyph.meterBlocks

  const cells = Array.from({ length: width }, (_, i) => {
    const pos = width === 1 ? 0 : i / (width - 1)
    const color = gradientAt(gradient, pos)
    if (i < full) return { ch: "█", fg: color }
    if (i === full && filled - full > 0.05) {
      const idx = Math.min(blocks.length - 1, Math.round((filled - full) * (blocks.length - 1)))
      return { ch: blocks[idx]!, fg: color }
    }
    return { ch: glyph.meterEmpty, fg: lerpHex(color, palette.void, 0.72) }
  })

  return (
    <box flexDirection="row">
      {cells.map((c, i) => (
        <text key={i} fg={c.fg}>
          {c.ch}
        </text>
      ))}
    </box>
  )
}

export function MeterStat({
  label,
  value,
  caption,
  width = 14,
}: {
  label: string
  value: number
  caption: string
  width?: number
}) {
  return (
    <box flexDirection="row" gap={1}>
      <text fg={palette.static}>{label}</text>
      <Meter value={value} width={width} />
      <text fg={palette.starlight}>{caption}</text>
    </box>
  )
}
