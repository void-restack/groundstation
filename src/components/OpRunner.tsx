import { useKeyboard } from "@opentui/react"
import { dismissOp, useOp } from "../state/oprunner"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import { LogView } from "./LogView"
import { Spinner } from "./Spinner"

export function OpRunner() {
  const op = useOp()
  useKeyboard((key) => {
    if (op && op.phase === "done" && key.name === "return") dismissOp()
  })
  if (!op) return null

  const done = op.phase === "done"
  const color = !done ? palette.active : op.ok ? palette.ok : palette.error
  const footer = done ? (
    <text fg={palette.accent}>[enter] dismiss</text>
  ) : (
    <text fg={palette.muted}>working…</text>
  )

  return (
    <Dialog
      title={`OP ${glyph.sep} ${op.title}`}
      onClose={done ? dismissOp : undefined}
      footer={footer}
      width="60%"
    >
      <box flexDirection="row" gap={1}>
        {done ? <text fg={color}>{glyph.stepDone}</text> : <Spinner color={color} />}
        <text fg={color}>{done ? (op.ok ? "complete" : "failed") : "running"}</text>
      </box>
      <LogView lines={op.lines} height={8} />
    </Dialog>
  )
}
