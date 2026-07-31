import { palette } from "../theme"

export interface KeyHint {
  key: string
  label: string
}

export function KeyStrip({ hints }: { hints: KeyHint[] }) {
  return (
    <box
      flexDirection="row"
      gap={2}
      paddingLeft={1}
      paddingRight={1}
      backgroundColor={palette.panel}
    >
      {hints.map((h) => (
        <box key={h.key} flexDirection="row">
          <text fg={palette.beacon}>[{h.key}]</text>
          <text fg={palette.static}>{h.label}</text>
        </box>
      ))}
    </box>
  )
}
