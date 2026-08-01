import { useKeyboard } from "@opentui/react"
import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { useMemo, useState } from "react"
import { config, detectSshKeys, getPersisted, type PersistedConfig } from "../config"
import { glyph, palette } from "../theme"
import { Field, PickerField } from "./Field"
import { SearchModal, type SearchItem } from "./SearchModal"

const FIELD_COUNT = 5

function shortPath(p: string): string {
  const home = homedir()
  return home && p.startsWith(home) ? `~${p.slice(home.length)}` : p
}

const NONE_LABEL = "(none — ssh agent/config)"

/**
 * The shared mission-config form, used by both the first-run setup and the
 * settings screen. Text fields are seeded once from the persisted profile and
 * read back via onInput (uncontrolled — a stable `value` never re-applies, so
 * edits survive re-renders). The SSH key is chosen from a fuzzy modal over the
 * detected ~/.ssh keys. Blank text fields persist as `null`, i.e. "auto-detect".
 *
 * `enabled` lets a parent (e.g. an overlay modal) freeze the form's keyboard.
 */
export function ConfigForm({
  onSave,
  onCancel,
  saveLabel = "save",
  cancelLabel = "cancel",
  enabled = true,
}: {
  onSave: (patch: Partial<PersistedConfig>) => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
  enabled?: boolean
}) {
  const init = useMemo(() => getPersisted(), [])
  const keys = useMemo(() => detectSshKeys(), [])
  const sshItems = useMemo<SearchItem<string | null>[]>(
    () => [{ value: null, label: NONE_LABEL }, ...keys.map((k) => ({ value: k, label: shortPath(k) }))],
    [keys],
  )

  const [focus, setFocus] = useState(0)
  const [sshPickerOpen, setSshPickerOpen] = useState(false)
  const [ansibleDir, setAnsibleDir] = useState(init.ansibleDir ?? "")
  const [sshKey, setSshKey] = useState<string | null>(init.sshKey ?? null)
  const [deployUser, setDeployUser] = useState(init.deployUser ?? "")
  const [bootstrapUser, setBootstrapUser] = useState(init.bootstrapUser ?? "")
  const [port, setPort] = useState(String(init.port))

  const save = () =>
    onSave({
      ansibleDir: ansibleDir.trim() || null,
      sshKey,
      deployUser: deployUser.trim() || null,
      bootstrapUser: bootstrapUser.trim() || null,
      port: Number(port) || init.port,
    })

  useKeyboard((key) => {
    if (!enabled || sshPickerOpen) return // frozen while an overlay/picker owns input
    if (key.name === "escape") return onCancel()
    if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % FIELD_COUNT)
    if (key.name === "up") return setFocus((f) => (f - 1 + FIELD_COUNT) % FIELD_COUNT)
    if (key.name === "return") return focus === 1 ? setSshPickerOpen(true) : save()
  })

  const dir = ansibleDir.trim()
  const ansibleState = !dir
    ? { text: "optional — enables Launch + Update", color: palette.static }
    : existsSync(join(dir, config.provisionPlaybook))
      ? { text: "✓ provisioning enabled", color: palette.nominal }
      : { text: "✗ provision playbook not found here", color: palette.flare }

  return (
    <box flexDirection="column" gap={1}>
      <Field label="ANSIBLE" focused={focus === 0}>
        <input
          focused={focus === 0 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={init.ansibleDir ?? ""}
          placeholder="~/path/to/ansible"
          onInput={setAnsibleDir}
        />
      </Field>
      <text fg={ansibleState.color}>{`  ${ansibleState.text}`}</text>

      <PickerField label="SSH KEY" value={sshKey ? shortPath(sshKey) : NONE_LABEL} focused={focus === 1} />

      <Field label="DEPLOY" focused={focus === 2}>
        <input
          focused={focus === 2 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={init.deployUser ?? ""}
          placeholder={config.deployUser}
          onInput={setDeployUser}
        />
      </Field>
      <Field label="BOOTSTRAP" focused={focus === 3}>
        <input
          focused={focus === 3 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={init.bootstrapUser ?? ""}
          placeholder={config.bootstrapUser}
          onInput={setBootstrapUser}
        />
      </Field>
      <Field label="PORT" focused={focus === 4}>
        <input
          focused={focus === 4 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={String(init.port)}
          placeholder="2222"
          onInput={setPort}
        />
      </Field>

      <text fg={palette.static} marginTop={1}>
        ↑↓/tab move {glyph.sep} enter {glyph.search} ssh key / {saveLabel} {glyph.sep} esc {cancelLabel}
      </text>

      {sshPickerOpen ? (
        <SearchModal<string | null>
          title="SELECT SSH KEY"
          placeholder="filter keys…"
          items={sshItems}
          onPick={setSshKey}
          onClose={() => setSshPickerOpen(false)}
        />
      ) : null}
    </box>
  )
}
