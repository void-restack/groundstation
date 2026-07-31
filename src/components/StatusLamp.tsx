import type { ServerStatus } from "../domain"
import { lerpHex } from "../lib/color"
import { statusVisual } from "../lib/status"
import { pulse, useClock } from "../state/clock"
import { glyph, palette } from "../theme"

function BreathingLamp({ color, breathMs }: { color: string; breathMs: number }) {
  const now = useClock()
  const dim = lerpHex(color, palette.void, 0.55)
  return <text fg={lerpHex(dim, color, pulse(now, breathMs))}>{glyph.lamp}</text>
}

export function StatusLamp({ status }: { status: ServerStatus }) {
  const { color, breathMs } = statusVisual(status)
  if (breathMs === null) return <text fg={color}>{glyph.lamp}</text>
  return <BreathingLamp color={color} breathMs={breathMs} />
}
