import type { InputRenderable } from "@opentui/core"
import { memo, useEffect, useRef } from "react"

/**
 * A modal text input done right: memoized so re-rendering the surrounding list
 * never reconciles the live input; focused imperatively one tick after mount
 * (the declarative `focused` prop lands too early and drops the first keystroke);
 * and `flexGrow` so leading characters never scroll off-screen. Use anywhere an
 * input should grab focus when its modal opens.
 */
export const FocusInput = memo(function FocusInput({
  placeholder,
  onInput,
}: {
  placeholder?: string
  onInput: (v: string) => void
}) {
  const ref = useRef<InputRenderable | null>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const el = ref.current
      if (el && !el.isDestroyed) el.focus()
    }, 1)
    return () => clearTimeout(id)
  }, [])
  return <input ref={ref} flexGrow={1} placeholder={placeholder} onInput={onInput} />
})
