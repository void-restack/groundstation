import { useToasts, type ToastVariant } from "../state/toast"
import { palette } from "../theme"

const VARIANT_COLOR: Record<ToastVariant, string> = {
  info: palette.downlink,
  success: palette.nominal,
  warning: palette.caution,
  error: palette.flare,
}

/**
 * Transient notifications stacked bottom-right, above everything but modals.
 * Each is a bordered card tinted by variant; messages wrap instead of blowing
 * out the layout the way a raw stderr dump does. Auto-dismissed by the store.
 */
export function ToastHost() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <box
      position="absolute"
      right={2}
      bottom={2}
      zIndex={90}
      flexDirection="column"
      alignItems="flex-end"
      gap={1}
    >
      {toasts.map((t) => (
        <box
          key={t.id}
          width={54}
          border
          borderStyle="rounded"
          borderColor={VARIANT_COLOR[t.variant]}
          backgroundColor={palette.panel}
          title={t.title ? ` ${t.title} ` : undefined}
          titleAlignment="left"
          paddingLeft={1}
          paddingRight={1}
          flexDirection="column"
        >
          <text fg={palette.starlight} wrapMode="word">
            {t.message}
          </text>
        </box>
      ))}
    </box>
  )
}
