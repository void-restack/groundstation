import { useKeyboard } from "@opentui/react"
import { ConfigForm } from "../components/ConfigForm"
import { applyAndSave } from "../state/config"
import { setScreen, setTools, useUI } from "../state/ui"
import { glyph, palette } from "../theme"

/** Edit config later; reachable from the board with [ , ]. */
export function Settings() {
  const { toolsOpen } = useUI()

  useKeyboard((key) => {
    if (toolsOpen) return
    if (key.ctrl && key.name === "t") setTools(true)
  })

  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.bg}>
      <text fg={palette.accent}>SETTINGS</text>
      <text fg={palette.muted}>
        Stored in ~/.config/groundstation/config.json {glyph.sep} environment variables override these
        {glyph.sep} [^T] tools.
      </text>

      <box
        marginTop={1}
        border
        borderStyle="rounded"
        borderColor={palette.active}
        title=" CONFIG "
        padding={1}
      >
        <ConfigForm
          enabled={!toolsOpen}
          onSave={(patch) => {
            applyAndSave(patch)
            setScreen("board")
          }}
          onCancel={() => setScreen("board")}
        />
      </box>
    </box>
  )
}
