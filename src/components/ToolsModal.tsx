import { useKeyboard, useRenderer } from "@opentui/react"
import { useState } from "react"
import { detectTools, installCommand, installTool, type ToolStatus } from "../adapters/tools"
import { pushToast } from "../state/toast"
import { setTools } from "../state/ui"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import { Spinner } from "./Spinner"

/**
 * The dependency doctor: shows whether gcloud / ssh are on PATH and,
 * for a missing one, offers to run its package-manager install command in the
 * real terminal. Selection + enter installs; the exact command is shown first.
 */
export function ToolsModal() {
  const renderer = useRenderer()
  const [statuses, setStatuses] = useState<ToolStatus[]>(() => detectTools())
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const clamped = Math.min(index, Math.max(0, statuses.length - 1))
  const current = statuses[clamped]!
  const close = () => setTools(false)

  const runInstall = async (status: ToolStatus) => {
    if (status.path || busy) return
    if (!installCommand(status.spec)) {
      pushToast({
        title: status.spec.label,
        message: `no auto-installer here — ${status.spec.docs}`,
        variant: "warning",
        duration: 9000,
      })
      return
    }
    setBusy(true)
    const res = await installTool(renderer, status.spec)
    setBusy(false)
    setStatuses(detectTools())
    pushToast({ title: status.spec.label, message: res.message, variant: res.ok ? "success" : "error" })
  }

  useKeyboard((key) => {
    if (busy) return
    if (key.name === "up") return setIndex(Math.max(0, clamped - 1))
    if (key.name === "down") return setIndex(Math.min(statuses.length - 1, clamped + 1))
    if (key.name === "return") return void runInstall(current)
    // escape → Dialog closes
  })

  const cmd = installCommand(current.spec)
  const footer = (
    <text fg={palette.static}>↑↓ select {glyph.sep} enter install {glyph.sep} esc close</text>
  )

  return (
    <Dialog title="MISSION DEPENDENCIES" onClose={close} footer={footer} width="72%">
      <box flexDirection="column">
        {statuses.map((s, i) => {
          const active = i === clamped
          const ok = !!s.path
          return (
            <box
              key={s.spec.id}
              flexDirection="row"
              gap={1}
              backgroundColor={active ? palette.raised : undefined}
            >
              <text fg={ok ? palette.nominal : palette.flare}>{ok ? "✓" : "✗"}</text>
              <text fg={active ? palette.starlight : palette.static}>{s.spec.label.padEnd(9)}</text>
              <text fg={palette.hairline}>{ok ? s.path : "not found"}</text>
            </box>
          )
        })}
      </box>

      <box flexDirection="column" marginTop={1}>
        <text fg={palette.static}>{current.spec.purpose}</text>
        {busy ? (
          <Spinner color={palette.beacon} label={`installing ${current.spec.label}… (watch the terminal)`} />
        ) : current.path ? (
          <text fg={palette.nominal}>installed {glyph.sep} {current.path}</text>
        ) : cmd ? (
          <text fg={palette.beacon}>[enter] runs: {cmd}</text>
        ) : (
          <text fg={palette.caution}>no auto-installer — {current.spec.docs}</text>
        )}
      </box>
    </Dialog>
  )
}
