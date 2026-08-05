import { RGBA, TextAttributes } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import type { ReactNode } from "react"
import { palette } from "../theme"

/** A dim scrim over the whole screen so a modal reads as focused. */
const SCRIM = RGBA.fromInts(0, 0, 0, 140)

/**
 * A centered, borderless overlay panel: full-screen scrim + a filled card with
 * an interior title row (title left, esc right). Owns escape-to-close. Content
 * inside manages its own focus (e.g. a focused <input>).
 */
export function Dialog({
  title,
  onClose,
  children,
  footer,
  width = "70%",
}: {
  title: string
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
  width?: number | `${number}%`
}) {
  useKeyboard((key) => {
    if (key.name === "escape") onClose?.()
  })

  return (
    <box
      position="absolute"
      left={0}
      top={0}
      width="100%"
      height="100%"
      zIndex={100}
      backgroundColor={SCRIM}
      alignItems="center"
      justifyContent="center"
    >
      <box
        width={width}
        backgroundColor={palette.panel}
        flexDirection="column"
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        gap={1}
      >
        <box flexDirection="row" justifyContent="space-between">
          <text fg={palette.accent} attributes={TextAttributes.BOLD}>
            {title}
          </text>
          {onClose ? <text fg={palette.muted}>esc</text> : null}
        </box>
        {children}
        {footer ? (
          <box flexDirection="row" gap={1} marginTop={1}>
            {footer}
          </box>
        ) : null}
      </box>
    </box>
  )
}
