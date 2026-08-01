import { useKeyboard } from "@opentui/react"
import { existsSync } from "fs"
import { homedir } from "os"
import { join } from "path"
import { useMemo, useState } from "react"
import { config, detectSshKeys, getPersisted, type PersistedConfig } from "../config"
import { glyph, palette } from "../theme"
import { Field, SelectField } from "./Field"

const FIELD_COUNT = 5

function shortPath(p: string): string {
  const home = homedir()
  return home && p.startsWith(home) ? `~${p.slice(home.length)}` : p
}

/**
 * The shared mission-config form, used by both the first-run setup and the
 * settings screen. Text fields are seeded once from the persisted profile and
 * read back via onInput (uncontrolled — a stable `value` never re-applies, so
 * edits survive re-renders). The SSH key is chosen from detected ~/.ssh keys.
 * Blank text fields persist as `null`, i.e. "auto-detect".
 */
export function ConfigForm({
  onSave,
  onCancel,
  saveLabel = "save",
  cancelLabel = "cancel",
}: {
  onSave: (patch: Partial<PersistedConfig>) => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
}) {
  const init = useMemo(() => getPersisted(), [])
  const keys = useMemo(() => detectSshKeys(), [])
  const sshOptions = useMemo(() => ["(none — ssh agent/config)", ...keys.map(shortPath)], [keys])

  const [focus, setFocus] = useState(0)
  const [ansibleDir, setAnsibleDir] = useState(init.ansibleDir ?? "")
  const [deployUser, setDeployUser] = useState(init.deployUser ?? "")
  const [bootstrapUser, setBootstrapUser] = useState(init.bootstrapUser ?? "")
  const [port, setPort] = useState(String(init.port))
  const [sshIdx, setSshIdx] = useState(() => {
    if (!init.sshKey) return 0
    const i = keys.indexOf(init.sshKey)
    return i >= 0 ? i + 1 : 0
  })

  const save = () =>
    onSave({
      ansibleDir: ansibleDir.trim() || null,
      sshKey: sshIdx === 0 ? null : (keys[sshIdx - 1] ?? null),
      deployUser: deployUser.trim() || null,
      bootstrapUser: bootstrapUser.trim() || null,
      port: Number(port) || init.port,
    })

  useKeyboard((key) => {
    if (key.name === "escape") return onCancel()
    if (key.name === "return") return save()
    if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % FIELD_COUNT)
    if (key.name === "up") return setFocus((f) => (f - 1 + FIELD_COUNT) % FIELD_COUNT)
    // ←/→ cycle the ssh-key select only; text fields keep them for the cursor
    if (focus === 1 && (key.name === "left" || key.name === "right")) {
      const dir = key.name === "right" ? 1 : -1
      return setSshIdx((i) => (i + dir + sshOptions.length) % sshOptions.length)
    }
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
          focused={focus === 0}
          flexGrow={1}
          value={init.ansibleDir ?? ""}
          placeholder="~/path/to/ansible"
          onInput={setAnsibleDir}
        />
      </Field>
      <text fg={ansibleState.color}>{`  ${ansibleState.text}`}</text>

      <SelectField label="SSH KEY" value={sshOptions[sshIdx]!} focused={focus === 1} />

      <Field label="DEPLOY" focused={focus === 2}>
        <input
          focused={focus === 2}
          flexGrow={1}
          value={init.deployUser ?? ""}
          placeholder={config.deployUser}
          onInput={setDeployUser}
        />
      </Field>
      <Field label="BOOTSTRAP" focused={focus === 3}>
        <input
          focused={focus === 3}
          flexGrow={1}
          value={init.bootstrapUser ?? ""}
          placeholder={config.bootstrapUser}
          onInput={setBootstrapUser}
        />
      </Field>
      <Field label="PORT" focused={focus === 4}>
        <input focused={focus === 4} flexGrow={1} value={String(init.port)} placeholder="2222" onInput={setPort} />
      </Field>

      <text fg={palette.static} marginTop={1}>
        ↑↓/tab move {glyph.sep} ◂ ▸ ssh key {glyph.sep} enter {saveLabel} {glyph.sep} esc {cancelLabel}
      </text>
    </box>
  )
}
