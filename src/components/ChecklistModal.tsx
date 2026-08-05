import { useKeyboard } from "@opentui/react"
import { useState } from "react"
import { glyph, palette } from "../theme"
import { Dialog } from "./Dialog"
import type { SearchItem } from "./SearchModal"

const VISIBLE = 8

/**
 * A multi-select checklist in a modal: navigate with up/down, space toggles the
 * highlighted row, enter confirms the whole selection, escape cancels. No filter
 * input (space would type into it) — meant for short, known lists like SSH keys.
 */
export function ChecklistModal<T>({
  title,
  items,
  selected,
  placeholder,
  onConfirm,
  onClose,
}: {
  title: string
  items: SearchItem<T>[]
  selected: T[]
  placeholder?: string
  onConfirm: (values: T[]) => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<T[]>(selected)
  const [index, setIndex] = useState(0)

  const clamped = Math.min(index, Math.max(0, items.length - 1))
  const start = Math.max(0, Math.min(clamped - Math.floor(VISIBLE / 2), Math.max(0, items.length - VISIBLE)))
  const shown = items.slice(start, start + VISIBLE)

  useKeyboard((key) => {
    if (key.name === "up") return setIndex(Math.max(0, clamped - 1))
    if (key.name === "down") return setIndex(Math.min(items.length - 1, clamped + 1))
    if (key.name === "space") {
      const it = items[clamped]
      if (it) setChosen((c) => (c.includes(it.value) ? c.filter((v) => v !== it.value) : [...c, it.value]))
      return
    }
    if (key.name === "return") {
      onConfirm(chosen)
      onClose()
    }
    // escape → Dialog closes
  })

  const footer = (
    <text fg={palette.muted}>
      ↑↓ move {glyph.sep} space toggle {glyph.sep} enter confirm {glyph.sep} esc cancel {glyph.sep} {chosen.length} selected
    </text>
  )

  return (
    <Dialog title={title} onClose={onClose} footer={footer} width="60%">
      <box flexDirection="column" height={Math.max(1, Math.min(VISIBLE, items.length))}>
        {items.length === 0 ? (
          <text fg={palette.muted}>{placeholder ?? "nothing to choose"}</text>
        ) : (
          shown.map((it, i) => {
            const realIdx = start + i
            const active = realIdx === clamped
            const on = chosen.includes(it.value)
            return (
              <box
                key={`${it.label}:${realIdx}`}
                flexDirection="row"
                gap={1}
                justifyContent="space-between"
                backgroundColor={active ? palette.raised : undefined}
              >
                <box flexDirection="row" gap={1}>
                  <text fg={active ? palette.active : palette.muted}>{active ? glyph.arrowRight : " "}</text>
                  <text fg={on ? palette.ok : palette.muted}>{on ? "[x]" : "[ ]"}</text>
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
