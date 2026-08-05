import "opentui-spinner/react"
import { glyph, palette } from "../theme"

/**
 * A braille throbber. Frames advance off OpenTUI's render loop (via the
 * opentui-spinner renderable), not a shared React clock, so it stays smooth and
 * costs nothing when off-screen. Uses the same frame set as the checklist icons.
 */
export function Spinner({
  label,
  color = palette.active,
}: {
  label?: string
  color?: string
}) {
  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <spinner frames={[...glyph.spinner]} interval={80} color={color} />
      {label ? <text fg={color}>{label}</text> : null}
    </box>
  )
}
