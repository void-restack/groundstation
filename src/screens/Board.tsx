import { useKeyboard, useRenderer } from "@opentui/react"
import { useEffect } from "react"
import { uplink } from "../adapters/ssh"
import { toggleMute } from "../audio/cues"
import { FleetRail } from "../components/FleetRail"
import { Glass } from "../components/Glass"
import { HealthHorizon } from "../components/HealthHorizon"
import { KeyStrip } from "../components/KeyStrip"
import { Ticker } from "../components/Ticker"
import { TopBar } from "../components/TopBar"
import { logEvent, refreshFleet, useEvents, useFleet } from "../state/fleet"
import { updateAll } from "../state/ops"
import { ensureSelection, moveSelection, setPalette, setQr, setScreen, useUI } from "../state/ui"
import { palette } from "../theme"

const HINTS = [
  { key: "↑↓", label: "select" },
  { key: "P", label: "rovision" },
  { key: "U", label: "pdate all" },
  { key: "S", label: "sh" },
  { key: "O", label: "rbit" },
  { key: "Q", label: "R handoff" },
  { key: "/", label: "command" },
]

export function Board() {
  const { servers, loading, error } = useFleet()
  const { selected, paletteOpen, qrOpen } = useUI()
  const events = useEvents()
  const renderer = useRenderer()

  const names = servers.map((s) => s.name)
  const current = servers.find((s) => s.name === selected) ?? null

  useEffect(() => {
    ensureSelection(names)
  }, [names.join(",")])

  useKeyboard((key) => {
    if (paletteOpen || qrOpen) return
    if (key.ctrl && key.name === "k") return setPalette(true)
    if (key.sequence === "/") return setPalette(true)
    switch (key.name) {
      case "up":
      case "k":
        return moveSelection(names, -1)
      case "down":
      case "j":
        return moveSelection(names, 1)
      case "p":
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
        if (current?.externalIp) setQr(true)
        return
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
      <HealthHorizon servers={servers} />
      {error ? (
        <text fg={palette.flare}> {error}</text>
      ) : null}
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
