import { useKeyboard } from "@opentui/react"
import { useState } from "react"
import { resolveConfirm, useConfirm, type ConfirmRequest } from "../state/confirm"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import { FocusInput } from "./FocusInput"

export function ConfirmDialog() {
  const req = useConfirm()
  if (!req) return null
  return req.mode === "typed" ? (
    <TypedConfirm key={req.title} req={req} />
  ) : (
    <YesNoConfirm key={req.title} req={req} />
  )
}

function Billing({ note }: { note?: string }) {
  if (!note) return null
  return <text fg={palette.caution}>{glyph.sep} {note}</text>
}

function YesNoConfirm({ req }: { req: ConfirmRequest }) {
  useKeyboard((key) => {
    if (key.name === "y") resolveConfirm(true)
    else if (key.name === "n") resolveConfirm(false)
  })
  const footer = (
    <text fg={palette.static}>
      [y] confirm {glyph.sep} [n/esc] cancel
    </text>
  )
  return (
    <Dialog title={req.title} onClose={() => resolveConfirm(false)} footer={footer} width="50%">
      <text fg={palette.starlight}>{req.message}</text>
      <Billing note={req.billing} />
    </Dialog>
  )
}

function TypedConfirm({ req }: { req: ConfirmRequest }) {
  const [value, setValue] = useState("")
  const expected = req.expectedName ?? ""
  const match = value.trim() === expected

  useKeyboard((key) => {
    if (key.name === "return" && match) resolveConfirm(true)
  })

  const footer = (
    <text fg={match ? palette.nominal : palette.static}>
      {match ? "[enter] confirm" : `type “${expected}” to confirm`} {glyph.sep} [esc] cancel
    </text>
  )
  return (
    <Dialog title={req.title} onClose={() => resolveConfirm(false)} footer={footer} width="50%">
      <text fg={palette.flare}>{req.message}</text>
      <Billing note={req.billing} />
      <box flexDirection="row" gap={1} marginTop={1}>
        <text fg={palette.beacon}>{glyph.arrowRight}</text>
        <FocusInput placeholder={expected} onInput={setValue} />
      </box>
    </Dialog>
  )
}
