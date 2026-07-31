import { useEffect } from "react"
import { initAudio } from "./audio/cues"
import { CommandPalette } from "./components/CommandPalette"
import { QrHandoff } from "./components/QrHandoff"
import { Board } from "./screens/Board"
import { Launch } from "./screens/Launch"
import { Orbit } from "./screens/Orbit"
import { startFleetPolling, useFleet } from "./state/fleet"
import { useUI } from "./state/ui"

export function App() {
  const { screen, paletteOpen, qrOpen, selected } = useUI()
  const { servers } = useFleet()

  useEffect(() => {
    startFleetPolling()
    initAudio()
  }, [])

  const current = servers.find((s) => s.name === selected) ?? null

  return (
    <box width="100%" height="100%">
      {screen === "launch" ? <Launch /> : screen === "orbit" ? <Orbit /> : <Board />}
      {paletteOpen ? <CommandPalette /> : null}
      {qrOpen && current ? <QrHandoff server={current} /> : null}
    </box>
  )
}
