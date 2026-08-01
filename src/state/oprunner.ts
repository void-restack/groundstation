import { createStore, useStore } from "../lib/store"

export interface OpState {
  title: string
  lines: string[]
  phase: "running" | "done"
  ok: boolean
}

const opStore = createStore<OpState | null>(null)
const MAX = 200

export async function runOp(
  title: string,
  task: (log: (line: string) => void) => Promise<void>,
): Promise<boolean> {
  opStore.set({ title, lines: [], phase: "running", ok: false })
  const log = (line: string) =>
    opStore.set((s) => (s ? { ...s, lines: [...s.lines, line].slice(-MAX) } : s))
  try {
    await task(log)
    opStore.set((s) => (s ? { ...s, phase: "done", ok: true } : s))
    return true
  } catch (err) {
    log(err instanceof Error ? err.message : String(err))
    opStore.set((s) => (s ? { ...s, phase: "done", ok: false } : s))
    return false
  }
}

export function dismissOp() {
  opStore.set(null)
}

export const useOp = () => useStore(opStore)
export const opActive = () => opStore.get() !== null
