import { createStore, useStore } from "../lib/store"

const FPS = 8
const clock = createStore(Date.now())

let handle: ReturnType<typeof setInterval> | null = null

function ensureRunning() {
  if (handle) return
  handle = setInterval(() => clock.set(Date.now()), 1000 / FPS)
  handle.unref?.()
}

export function useClock(): number {
  ensureRunning()
  return useStore(clock)
}

export function pulse(now: number, periodMs: number): number {
  return 0.5 + 0.5 * Math.sin((now / periodMs) * Math.PI * 2)
}
