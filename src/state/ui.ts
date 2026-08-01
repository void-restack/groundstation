import { createStore, useStore } from "../lib/store"

export type Screen = "board" | "launch" | "orbit" | "settings"

interface UIState {
  screen: Screen
  selected: string | null
  paletteOpen: boolean
  toolsOpen: boolean
  actionMenuOpen: boolean
  projectSwitchOpen: boolean
}

const ui = createStore<UIState>({
  screen: "board",
  selected: null,
  paletteOpen: false,
  toolsOpen: false,
  actionMenuOpen: false,
  projectSwitchOpen: false,
})

export const useUI = () => useStore(ui)

export const setScreen = (screen: Screen) => ui.set((s) => ({ ...s, screen }))
export const select = (selected: string | null) => ui.set((s) => ({ ...s, selected }))
export const setPalette = (paletteOpen: boolean) => ui.set((s) => ({ ...s, paletteOpen }))
export const setTools = (toolsOpen: boolean) => ui.set((s) => ({ ...s, toolsOpen }))
export const setActionMenu = (actionMenuOpen: boolean) => ui.set((s) => ({ ...s, actionMenuOpen }))
export const setProjectSwitch = (projectSwitchOpen: boolean) => ui.set((s) => ({ ...s, projectSwitchOpen }))

export function moveSelection(names: string[], delta: number) {
  ui.set((s) => {
    if (names.length === 0) return s
    const idx = s.selected ? names.indexOf(s.selected) : -1
    const next = (idx + delta + names.length) % names.length
    return { ...s, selected: names[next]! }
  })
}

export function ensureSelection(names: string[]) {
  ui.set((s) => {
    if (s.selected && names.includes(s.selected)) return s
    return { ...s, selected: names[0] ?? null }
  })
}
