import type { ReactNode } from "react"
import { superscript } from "../lib/gradient"
import { palette } from "../theme"

interface PanelProps {
  index: number
  title: string
  children: ReactNode
  focused?: boolean
  width?: number
  flexGrow?: number
  padding?: number
  right?: string
}

export function Panel({
  index,
  title,
  children,
  focused = false,
  width,
  flexGrow,
  padding,
  right,
}: PanelProps) {
  return (
    <box
      width={width}
      flexGrow={flexGrow}
      padding={padding}
      border
      borderStyle="rounded"
      borderColor={focused ? palette.downlink : palette.hairline}
      title={`${superscript(index)} ${title}`}
      titleAlignment="left"
      titleColor={focused ? palette.downlink : palette.static}
      bottomTitle={right}
      bottomTitleAlignment="right"
      flexDirection="column"
    >
      {children}
    </box>
  )
}
