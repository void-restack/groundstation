import { useKeyboard } from "@opentui/react"
import fuzzysort from "fuzzysort"
import { useCallback, useMemo, useState } from "react"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import { FocusInput } from "./FocusInput"

export interface SearchItem<T> {
  value: T
  label: string
  /** optional right-aligned secondary text (e.g. a category or description) */
  hint?: string
}

const VISIBLE = 8

/**
 * A fuzzy-search picker in a modal: a focused query input over a live-filtered,
 * keyboard-navigable list. Enter picks and closes; escape (via Dialog) cancels.
 * Search matches both the label and the hint (e.g. a zone's city).
 */
export function SearchModal<T>({
  title,
  items,
  placeholder = "type to filter…",
  onPick,
  onClose,
}: {
  title: string
  items: SearchItem<T>[]
  placeholder?: string
  onPick: (value: T) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [index, setIndex] = useState(0)

  const onInput = useCallback((v: string) => {
    setQuery(v)
    setIndex(0)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return fuzzysort.go(q, items, { keys: ["label", "hint"], limit: 200 }).map((r) => r.obj)
  }, [query, items])

  const clamped = Math.min(index, Math.max(0, filtered.length - 1))
  const rows = Math.max(1, Math.min(VISIBLE, filtered.length))
  const start = Math.max(0, Math.min(clamped - Math.floor(VISIBLE / 2), Math.max(0, filtered.length - VISIBLE)))
  const shown = filtered.slice(start, start + VISIBLE)

  useKeyboard((key) => {
    if (key.name === "up") return setIndex(Math.max(0, clamped - 1))
    if (key.name === "down") return setIndex(Math.min(filtered.length - 1, clamped + 1))
    if (key.name === "return") {
      const hit = filtered[clamped]
      if (hit) {
        onPick(hit.value)
        onClose()
      }
    }
    // escape → Dialog closes; ←/→ + printables stay with the focused input
  })

  const footer = (
    <text fg={palette.muted}>
      ↑↓ move {glyph.sep} enter select {glyph.sep} esc cancel {glyph.sep} {filtered.length} match
      {filtered.length === 1 ? "" : "es"}
    </text>
  )

  return (
    <Dialog title={title} onClose={onClose} footer={footer} width="60%">
      <box flexDirection="row" gap={1}>
        <text fg={palette.accent}>{glyph.arrowRight}</text>
        <FocusInput placeholder={placeholder} onInput={onInput} />
      </box>
      <box flexDirection="column" height={rows}>
        {filtered.length === 0 ? (
          <text fg={palette.muted}>no matches</text>
        ) : (
          shown.map((it, i) => {
            const realIdx = start + i
            const active = realIdx === clamped
            return (
              <box
                key={`${it.label}:${realIdx}`}
                flexDirection="row"
                gap={1}
                justifyContent="space-between"
                backgroundColor={active ? palette.raised : undefined}
              >
                <box flexDirection="row" gap={1}>
                  <text fg={active ? palette.active : palette.muted}>
                    {active ? glyph.arrowRight : " "}
                  </text>
                  <text fg={active ? palette.text : palette.muted}>{it.label}</text>
                </box>
                {it.hint ? <text fg={palette.muted}>{it.hint}</text> : null}
              </box>
            )
          })
        )}
      </box>
    </Dialog>
  )
}
