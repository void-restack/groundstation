import { TextAttributes, type InputRenderable } from "@opentui/core"
import { useKeyboard, useRenderer } from "@opentui/react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { uplink } from "../adapters/ssh"
import { reauth } from "../adapters/auth"
import { isMuted, toggleMute } from "../audio/cues"
import { logEvent, refreshFleet, useFleet } from "../state/fleet"
import { setPalette, setProjectSwitch, setScreen, setTools, useUI } from "../state/ui"
import { glyph, palette } from "../theme"

interface Command {
  id: string
  title: string
  run: () => void
}

/** Memoized + imperatively focused after mount, so re-renders never disturb the input
 *  and the first keystroke isn't dropped before focus settles (see SearchModal). */
const PaletteInput = memo(function PaletteInput({ onInput }: { onInput: (v: string) => void }) {
  const inputRef = useRef<InputRenderable | null>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const el = inputRef.current
      if (el && !el.isDestroyed) el.focus()
    }, 1)
    return () => clearTimeout(id)
  }, [])
  return (
    <box flexDirection="row" gap={1}>
      <text fg={palette.beacon}>{glyph.arrowRight}</text>
      <input ref={inputRef} flexGrow={1} placeholder="type a command…" onInput={onInput} />
    </box>
  )
})

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
      { id: "provision", title: "Provision a new vessel", run: () => setScreen("launch") },
      {
        id: "ssh",
        title: current ? `Uplink → ${current.name}` : "Uplink (select a vessel first)",
        run: () => {
          if (current) void uplink(renderer, current).then(() => refreshFleet())
        },
      },
      { id: "orbit", title: "Orbit view", run: () => setScreen("orbit") },
      { id: "project", title: "Switch project — change active GCP project", run: () => setProjectSwitch(true) },
      {
        id: "auth",
        title: "Re-authenticate — gcloud auth login",
        run: () => void reauth(renderer).then(() => refreshFleet()),
      },
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
        <text fg={palette.beacon} attributes={TextAttributes.BOLD}>COMMAND</text>
        <text fg={palette.static}>esc</text>
      </box>
      <PaletteInput onInput={onInput} />
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
