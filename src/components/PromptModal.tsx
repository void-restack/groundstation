import { useKeyboard } from "@opentui/react"
import { useState } from "react"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import { FocusInput } from "./FocusInput"

/**
 * A one-line text prompt in a modal: a focused input, enter submits the trimmed
 * value (no-op while empty), escape (via Dialog) cancels. Used to name a preset.
 */
export function PromptModal({
  title,
  placeholder,
  onSubmit,
  onClose,
}: {
  title: string
  placeholder?: string
  onSubmit: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState("")

  useKeyboard((key) => {
    if (key.name === "return" && value.trim()) {
      onSubmit(value.trim())
      onClose()
    }
  })

  const footer = <text fg={palette.muted}>enter save {glyph.sep} esc cancel</text>

  return (
    <Dialog title={title} onClose={onClose} footer={footer} width="50%">
      <box flexDirection="row" gap={1}>
        <text fg={palette.accent}>{glyph.arrowRight}</text>
        <FocusInput placeholder={placeholder} onInput={setValue} />
      </box>
    </Dialog>
  )
}
