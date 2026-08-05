import type { ReactNode } from "react"
import { glyph, palette } from "../theme"
import { Spinner } from "./Spinner"

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
      <text fg={focused ? palette.active : palette.muted}>{label.padEnd(labelWidth)}</text>
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

/**
 * A Field whose value is chosen from a fuzzy SearchModal — the ⌕ affordance
 * signals "enter to search". While `busy`, a spinner replaces the glyph (e.g.
 * loading options from the network). The caller owns the modal + selection.
 */
export function PickerField({
  label,
  value,
  focused,
  busy,
}: {
  label: string
  value: string
  focused: boolean
  busy?: boolean
}) {
  return (
    <Field label={label} focused={focused}>
      <text fg={palette.text}>{value}</text>
      {busy ? <Spinner /> : <text fg={focused ? palette.accent : palette.border}>{glyph.search}</text>}
    </Field>
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
      <text fg={focused ? palette.accent : palette.border}>◂</text>
      <text fg={palette.text}>{value}</text>
      <text fg={focused ? palette.accent : palette.border}>▸</text>
    </Field>
  )
}
