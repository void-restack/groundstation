import { useEffect } from "react"
import { initAudio } from "./audio/cues"
import { CommandPalette } from "./components/CommandPalette"
import { Board } from "./screens/Board"
import { Launch } from "./screens/Launch"
import { Orbit } from "./screens/Orbit"
import { startFleetPolling } from "./state/fleet"
import { useUI } from "./state/ui"

export function App() {
  const { screen, paletteOpen } = useUI()

  useEffect(() => {
    startFleetPolling()
    initAudio()
  }, [])

  return (
    <box width="100%" height="100%">
      {screen === "launch" ? <Launch /> : screen === "orbit" ? <Orbit /> : <Board />}
      {paletteOpen ? <CommandPalette /> : null}
    </box>
  )
}
