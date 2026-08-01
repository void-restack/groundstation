import { RGBA } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import type { ReactNode } from "react"
import { palette } from "../theme"

/** A dim scrim over the whole screen so a modal reads as focused. */
const SCRIM = RGBA.fromInts(0, 0, 0, 140)

/**
 * A centered overlay panel: full-screen scrim + a bordered box, with an
 * optional footer row. Owns escape-to-close so callers don't have to. Content
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
        border
        borderStyle="double"
        borderColor={palette.downlink}
        backgroundColor={palette.panel}
        title={` ${title} `}
        titleAlignment="center"
        flexDirection="column"
        padding={1}
        gap={1}
      >
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
