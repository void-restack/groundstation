import { createStore, useStore } from "../lib/store"

export type ToastVariant = "info" | "success" | "warning" | "error"

export interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
}

const MAX = 3
const toasts = createStore<Toast[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

export const useToasts = () => useStore(toasts)

export function dismissToast(id: string) {
  const handle = timers.get(id)
  if (handle) {
    clearTimeout(handle)
    timers.delete(id)
  }
  toasts.set((prev) => prev.filter((t) => t.id !== id))
}

export function pushToast(input: {
  message: string
  title?: string
  variant?: ToastVariant
  duration?: number
}): string {
  const id = crypto.randomUUID()
  const toast: Toast = {
    id,
    message: input.message,
    title: input.title,
    variant: input.variant ?? "info",
  }
  toasts.set((prev) => [...prev.slice(-(MAX - 1)), toast])
  const handle = setTimeout(() => dismissToast(id), input.duration ?? 6000)
  handle.unref?.()
  timers.set(id, handle)
  return id
}
