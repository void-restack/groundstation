import { useKeyboard } from "@opentui/react"
import { dismissDetail, useDetail } from "../state/detail"
import { palette } from "../theme"
import { Dialog } from "./Dialog"

export function DetailDialog() {
  const detail = useDetail()
  useKeyboard((key) => {
    if (detail && key.name === "return") dismissDetail()
  })
  if (!detail) return null

  return (
    <Dialog
      title={detail.title}
      onClose={dismissDetail}
      footer={<text fg={palette.beacon}>[enter/esc] close</text>}
      width="60%"
    >
      <scrollbox height={14} paddingLeft={1} paddingRight={1}>
        {detail.lines.map((line, i) => (
          <text key={i} fg={palette.static}>
            {line}
          </text>
        ))}
      </scrollbox>
    </Dialog>
  )
}
