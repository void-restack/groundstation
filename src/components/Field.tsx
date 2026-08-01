import type { ReactNode } from "react"
import { palette } from "../theme"

/**
 * A labelled control row: a right-padded label followed by a fixed-size cell
 * that holds either an <input> or a cyclable value. Focus tints the label and
 * lifts the cell background. Shared by the Launch form, the setup wizard, and
 * the settings screen so they all feel the same.
 */
export function Field({
  label,
  focused,
  children,
  labelWidth = 9,
  boxWidth = 44,
}: {
  label: string
  focused: boolean
  children: ReactNode
  labelWidth?: number
  boxWidth?: number
}) {
  return (
    <box flexDirection="row" gap={1} alignItems="center">
      <text fg={focused ? palette.downlink : palette.static}>{label.padEnd(labelWidth)}</text>
      <box
        width={boxWidth}
        height={1}
        backgroundColor={focused ? palette.raised : palette.panel}
        paddingLeft={1}
        paddingRight={1}
        flexDirection="row"
        justifyContent="space-between"
      >
        {children}
      </box>
    </box>
  )
}

/** A Field whose value is cycled with ◂ / ▸ (left/right) rather than typed. */
export function SelectField({
  label,
  value,
  focused,
  labelWidth,
  boxWidth,
}: {
  label: string
  value: string
  focused: boolean
  labelWidth?: number
  boxWidth?: number
}) {
  return (
    <Field label={label} focused={focused} labelWidth={labelWidth} boxWidth={boxWidth}>
      <text fg={focused ? palette.beacon : palette.hairline}>◂</text>
      <text fg={palette.starlight}>{value}</text>
      <text fg={focused ? palette.beacon : palette.hairline}>▸</text>
    </Field>
  )
}
