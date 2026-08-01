import { useEffect } from "react"
import { initAudio } from "./audio/cues"
import { CommandPalette } from "./components/CommandPalette"
import { ConfirmDialog } from "./components/ConfirmDialog"
import { DetailDialog } from "./components/DetailDialog"
import { OpRunner } from "./components/OpRunner"
import { ProjectSwitcher } from "./components/ProjectSwitcher"
import { ToastHost } from "./components/ToastHost"
import { ToolsModal } from "./components/ToolsModal"
import { Board } from "./screens/Board"
import { Launch } from "./screens/Launch"
import { Orbit } from "./screens/Orbit"
import { Settings } from "./screens/Settings"
import { Setup } from "./screens/Setup"
import { useConfig } from "./state/config"
import { startFleetPolling } from "./state/fleet"
import { setProjectSwitch, useUI } from "./state/ui"

export function App() {
  const { screen, paletteOpen, toolsOpen, projectSwitchOpen } = useUI()
  const { firstRun } = useConfig()

  useEffect(() => {
    startFleetPolling()
    initAudio()
  }, [])

  if (firstRun) {
    return (
      <box width="100%" height="100%">
        <Setup />
        {toolsOpen ? <ToolsModal /> : null}
        <ToastHost />
      </box>
    )
  }

  return (
    <box width="100%" height="100%">
      {screen === "launch" ? (
        <Launch />
      ) : screen === "orbit" ? (
        <Orbit />
      ) : screen === "settings" ? (
        <Settings />
      ) : (
        <Board />
      )}
      {paletteOpen ? <CommandPalette /> : null}
      {toolsOpen ? <ToolsModal /> : null}
      {projectSwitchOpen ? <ProjectSwitcher onClose={() => setProjectSwitch(false)} /> : null}
      <ConfirmDialog />
      <OpRunner />
      <DetailDialog />
      <ToastHost />
    </box>
  )
}
