import type { ReactNode } from "react"
import { superscript } from "../lib/gradient"
import { palette } from "../theme"

interface PanelProps {
  index: number
  title: string
  children: ReactNode
  focused?: boolean
  width?: number
  height?: number
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
  height,
  flexGrow,
  padding,
  right,
}: PanelProps) {
  return (
    <box
      width={width}
      height={height}
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
