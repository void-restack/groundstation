import { useKeyboard, useRenderer } from "@opentui/react"
import { useEffect } from "react"
import { uplink } from "../adapters/ssh"
import { toggleMute } from "../audio/cues"
import { ActionMenu } from "../components/ActionMenu"
import { FleetRail } from "../components/FleetRail"
import { Glass } from "../components/Glass"
import { KeyStrip } from "../components/KeyStrip"
import { Overview } from "../components/Overview"
import { Ticker } from "../components/Ticker"
import { TopBar } from "../components/TopBar"
import { confirmActive } from "../state/confirm"
import { detailActive } from "../state/detail"
import { logEvent, refreshFleet, useEvents, useFleet } from "../state/fleet"
import { opActive } from "../state/oprunner"
import { ensureSelection, moveSelection, setActionMenu, setPalette, setScreen, setTools, useUI } from "../state/ui"
import { palette } from "../theme"

const HINTS = [
  { key: "↑↓", label: "select" },
  { key: "⏎", label: "actions" },
  { key: "P", label: "rovision" },
  { key: "S", label: "sh" },
  { key: "O", label: "rbit" },
  { key: ",", label: "settings" },
  { key: "^T", label: "tools" },
  { key: "/", label: "command" },
  { key: "Q", label: "uit" },
]

export function Board() {
  const { instances, loading } = useFleet()
  const { selected, paletteOpen, toolsOpen, actionMenuOpen, projectSwitchOpen } = useUI()
  const events = useEvents()
  const renderer = useRenderer()

  const names = instances.map((s) => s.name)
  const current = instances.find((s) => s.name === selected) ?? null

  useEffect(() => {
    ensureSelection(names)
  }, [names.join(",")])

  useKeyboard((key) => {
    if (paletteOpen || toolsOpen || actionMenuOpen || projectSwitchOpen || confirmActive() || opActive() || detailActive()) return
    if (key.ctrl && key.name === "k") return setPalette(true)
    if (key.ctrl && key.name === "t") return setTools(true)
    if (key.sequence === "/") return setPalette(true)
    if (key.sequence === ",") return setScreen("settings")
    if (key.name === "return") return void (current && setActionMenu(true))
    switch (key.name) {
      case "up":
      case "k":
        return moveSelection(names, -1)
      case "down":
      case "j":
        return moveSelection(names, 1)
      case "a":
        return void (current && setActionMenu(true))
      case "p":
        // always open the provision screen; it shows a disabled banner with a
        // jump to settings when there's no playbook dir yet
        return setScreen("launch")
      case "o":
        return setScreen("orbit")
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
      <TopBar fleetSize={instances.length} />
      <Overview instances={instances} />
      <box flexDirection="row" flexGrow={1}>
        <FleetRail instances={instances} selected={selected} />
        <Glass instance={current} />
        <Ticker events={events} />
      </box>
      <KeyStrip hints={HINTS} />
      {loading && instances.length === 0 ? (
        <text fg={palette.static}> acquiring fleet…</text>
      ) : null}
      {actionMenuOpen && current ? (
        <ActionMenu instance={current} onClose={() => setActionMenu(false)} />
      ) : null}
    </box>
  )
}
