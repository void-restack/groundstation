import { useKeyboard, useRenderer } from "@opentui/react"
import { useEffect } from "react"
import { capabilities } from "../config"
import { uplink } from "../adapters/ssh"
import { toggleMute } from "../audio/cues"
import { FleetRail } from "../components/FleetRail"
import { Glass } from "../components/Glass"
import { KeyStrip } from "../components/KeyStrip"
import { Overview } from "../components/Overview"
import { Ticker } from "../components/Ticker"
import { TopBar } from "../components/TopBar"
import { logEvent, refreshFleet, useEvents, useFleet } from "../state/fleet"
import { updateAll } from "../state/ops"
import { ensureSelection, moveSelection, setPalette, setScreen, useUI } from "../state/ui"
import { palette } from "../theme"

const HINTS = [
  { key: "↑↓", label: "select" },
  { key: "P", label: "rovision" },
  { key: "U", label: "pdate all" },
  { key: "S", label: "sh" },
  { key: "O", label: "rbit" },
  { key: ",", label: "settings" },
  { key: "/", label: "command" },
  { key: "Q", label: "uit" },
]

export function Board() {
  const { servers, loading } = useFleet()
  const { selected, paletteOpen } = useUI()
  const events = useEvents()
  const renderer = useRenderer()

  const names = servers.map((s) => s.name)
  const current = servers.find((s) => s.name === selected) ?? null

  useEffect(() => {
    ensureSelection(names)
  }, [names.join(",")])

  useKeyboard((key) => {
    if (paletteOpen) return
    if (key.ctrl && key.name === "k") return setPalette(true)
    if (key.sequence === "/") return setPalette(true)
    if (key.sequence === ",") return setScreen("settings")
    switch (key.name) {
      case "up":
      case "k":
        return moveSelection(names, -1)
      case "down":
      case "j":
        return moveSelection(names, 1)
      case "p":
        if (!capabilities.canProvision) {
          logEvent({ server: null, level: "caution", message: "provisioning unavailable — set an ansible dir in settings ( , )" })
          return
        }
        return setScreen("launch")
      case "o":
        return setScreen("orbit")
      case "u":
        return void updateAll()
      case "s":
        if (current?.externalIp) {
          logEvent({ server: current.name, level: "info", message: `uplink → ${current.name}` })
          void uplink(renderer, current).then(() => refreshFleet())
        }
        return
      case "q":
        return renderer.destroy()
      case "m": {
        const muted = toggleMute()
        logEvent({ server: null, level: "info", message: muted ? "audio muted" : "audio on" })
        return
      }
    }
  })

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={palette.void}>
      <TopBar fleetSize={servers.length} />
      <Overview servers={servers} />
      <box flexDirection="row" flexGrow={1}>
        <FleetRail servers={servers} selected={selected} />
        <Glass server={current} />
        <Ticker events={events} />
      </box>
      <KeyStrip hints={HINTS} />
      {loading && servers.length === 0 ? (
        <text fg={palette.static}> acquiring fleet…</text>
      ) : null}
    </box>
  )
}
