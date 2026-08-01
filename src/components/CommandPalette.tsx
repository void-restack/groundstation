import { useKeyboard, useRenderer } from "@opentui/react"
import { useMemo, useState } from "react"
import { uplink } from "../adapters/ssh"
import { isMuted, toggleMute } from "../audio/cues"
import { logEvent, refreshFleet, useFleet } from "../state/fleet"
import { updateAll } from "../state/ops"
import { setPalette, setScreen, setTools, useUI } from "../state/ui"
import { glyph, palette } from "../theme"

interface Command {
  id: string
  title: string
  run: () => void
}

export function CommandPalette() {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const { servers } = useFleet()
  const { selected } = useUI()
  const renderer = useRenderer()

  const current = servers.find((s) => s.name === selected) ?? null

  const commands = useMemo<Command[]>(
    () => [
      { id: "provision", title: "Provision a new vessel", run: () => setScreen("launch") },
      { id: "update", title: "Update all — constellation sweep", run: () => void updateAll() },
      {
        id: "ssh",
        title: current ? `Uplink → ${current.name}` : "Uplink (select a vessel first)",
        run: () => {
          if (current?.externalIp) void uplink(renderer, current).then(() => refreshFleet())
        },
      },
      { id: "orbit", title: "Orbit view", run: () => setScreen("orbit") },
      { id: "settings", title: "Settings — mission config", run: () => setScreen("settings") },
      { id: "tools", title: "Dependencies — check & install tools", run: () => setTools(true) },
      { id: "refresh", title: "Refresh fleet", run: () => void refreshFleet() },
      {
        id: "sound",
        title: isMuted() ? "Unmute sound cues" : "Mute sound cues",
        run: () => {
          const muted = toggleMute()
          logEvent({ server: null, level: "info", message: muted ? "audio muted" : "audio on" })
        },
      },
      { id: "quit", title: "Quit GROUNDSTATION", run: () => renderer.destroy() },
    ],
    [current, renderer],
  )

  const filtered = commands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
  const clamped = Math.min(index, Math.max(0, filtered.length - 1))

  const close = () => {
    setPalette(false)
    setQuery("")
    setIndex(0)
  }

  useKeyboard((key) => {
    if (key.name === "escape") return close()
    if (key.name === "up") return setIndex((i) => Math.max(0, i - 1))
    if (key.name === "down") return setIndex((i) => Math.min(filtered.length - 1, i + 1))
    if (key.name === "return") {
      const cmd = filtered[clamped]
      close()
      cmd?.run()
    }
  })

  return (
    <box
      position="absolute"
      left="15%"
      top={4}
      width="70%"
      border
      borderStyle="double"
      borderColor={palette.downlink}
      backgroundColor={palette.panel}
      title=" COMMAND "
      titleAlignment="center"
      flexDirection="column"
      padding={1}
      gap={1}
      zIndex={100}
    >
      <box flexDirection="row" gap={1}>
        <text fg={palette.beacon}>{glyph.arrowRight}</text>
        <input focused placeholder="type a command…" onInput={setQuery} />
      </box>
      <box flexDirection="column">
        {filtered.length === 0 ? (
          <text fg={palette.static}>no matches</text>
        ) : (
          filtered.map((c, i) => (
            <box key={c.id} flexDirection="row" gap={1} backgroundColor={i === clamped ? palette.raised : undefined}>
              <text fg={i === clamped ? palette.downlink : palette.static}>
                {i === clamped ? glyph.arrowRight : " "}
              </text>
              <text fg={i === clamped ? palette.starlight : palette.static}>{c.title}</text>
            </box>
          ))
        )}
      </box>
    </box>
  )
}
