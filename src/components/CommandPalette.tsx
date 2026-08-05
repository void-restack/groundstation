import { TextAttributes } from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/react"
import { useCallback, useMemo, useState } from "react"
import { uplink } from "../adapters/ssh"
import { reauth } from "../adapters/auth"
import { isMuted, toggleMute } from "../audio/cues"
import { logEvent, refreshFleet, useFleet } from "../state/fleet"
import { setPalette, setProjectSwitch, setProviderSwitch, setScreen, setTools, useUI } from "../state/ui"
import { glyph, palette } from "../theme"
import { FocusInput } from "./FocusInput"

interface Command {
  id: string
  title: string
  run: () => void
}

export function CommandPalette() {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)
  const { instances } = useFleet()
  const { selected } = useUI()
  const renderer = useRenderer()
  const onInput = useCallback((v: string) => {
    setQuery(v)
    setIndex(0)
  }, [])

  const current = instances.find((s) => s.name === selected) ?? null

  const commands = useMemo<Command[]>(
    () => [
      { id: "new", title: "New instance", run: () => setScreen("launch") },
      {
        id: "ssh",
        title: current ? `SSH → ${current.name}` : "SSH (select an instance first)",
        run: () => {
          if (current) void uplink(renderer, current).then(() => refreshFleet())
        },
      },
      { id: "map", title: "Region map", run: () => setScreen("orbit") },
      { id: "provider", title: "Switch provider (cloud)", run: () => setProviderSwitch(true) },
      { id: "project", title: "Switch project (GCP)", run: () => setProjectSwitch(true) },
      {
        id: "auth",
        title: "Re-authenticate — gcloud auth login",
        run: () => void reauth(renderer).then(() => refreshFleet()),
      },
      { id: "settings", title: "Settings", run: () => setScreen("settings") },
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
      backgroundColor={palette.panel}
      flexDirection="column"
      paddingTop={1}
      paddingBottom={1}
      paddingLeft={2}
      paddingRight={2}
      gap={1}
      zIndex={100}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text fg={palette.accent} attributes={TextAttributes.BOLD}>COMMAND</text>
        <text fg={palette.muted}>esc</text>
      </box>
      <box flexDirection="row" gap={1}>
        <text fg={palette.accent}>{glyph.arrowRight}</text>
        <FocusInput placeholder="type a command…" onInput={onInput} />
      </box>
      <box flexDirection="column">
        {filtered.length === 0 ? (
          <text fg={palette.muted}>no matches</text>
        ) : (
          filtered.map((c, i) => (
            <box key={c.id} flexDirection="row" gap={1} backgroundColor={i === clamped ? palette.raised : undefined}>
              <text fg={i === clamped ? palette.active : palette.muted}>
                {i === clamped ? glyph.arrowRight : " "}
              </text>
              <text fg={i === clamped ? palette.text : palette.muted}>{c.title}</text>
            </box>
          ))
        )}
      </box>
    </box>
  )
}
