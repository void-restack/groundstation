import { useKeyboard } from "@opentui/react"
import { ConfigForm } from "../components/ConfigForm"
import { applyAndSave } from "../state/config"
import { setScreen, setTools, useUI } from "../state/ui"
import { glyph, palette } from "../theme"

/** Edit the same mission config later; reachable from the board with [ , ]. */
export function Settings() {
  const { toolsOpen } = useUI()

  useKeyboard((key) => {
    if (toolsOpen) return
    if (key.ctrl && key.name === "t") setTools(true)
  })

  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.void}>
      <text fg={palette.beacon}>SETTINGS {glyph.sep} MISSION CONFIG</text>
      <text fg={palette.static}>
        Stored in ~/.config/groundstation/config.json {glyph.sep} environment variables override these
        {glyph.sep} [^T] tools.
      </text>

      <box
        marginTop={1}
        border
        borderStyle="double"
        borderColor={palette.downlink}
        title=" MISSION CONFIG "
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
