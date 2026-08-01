import { createStore, useStore } from "../lib/store"

export type ConfirmMode = "yn" | "typed"

export interface ConfirmRequest {
  title: string
  message: string
  billing?: string
  mode: ConfirmMode
  expectedName?: string
}

interface ConfirmEntry extends ConfirmRequest {
  resolve: (ok: boolean) => void
}

const confirmStore = createStore<ConfirmEntry | null>(null)

export function confirm(req: ConfirmRequest): Promise<boolean> {
  return new Promise((resolve) => {
    const prev = confirmStore.get()
    if (prev) prev.resolve(false)
    confirmStore.set({ ...req, resolve })
  })
}

export function resolveConfirm(ok: boolean) {
  const cur = confirmStore.get()
  if (!cur) return
  confirmStore.set(null)
  cur.resolve(ok)
}

export const useConfirm = () => useStore(confirmStore)
export const confirmActive = () => confirmStore.get() !== null
