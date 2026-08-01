import { createStore, useStore } from "../lib/store"

interface DetailState {
  title: string
  lines: string[]
}

const detailStore = createStore<DetailState | null>(null)

export function showDetail(title: string, lines: string[]) {
  detailStore.set({ title, lines })
}

export function dismissDetail() {
  detailStore.set(null)
}

export const useDetail = () => useStore(detailStore)
export const detailActive = () => detailStore.get() !== null
