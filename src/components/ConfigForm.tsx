import { useKeyboard } from "@opentui/react"
import { existsSync } from "fs"
import { homedir } from "os"
import { useMemo, useState } from "react"
import { config, detectSshKeys, expandHome, getPersisted, type PersistedConfig } from "../config"
import { glyph, palette } from "../theme"
import { Field, PickerField } from "./Field"
import { SearchModal, type SearchItem } from "./SearchModal"

const FIELD_COUNT = 5

function shortPath(p: string): string {
  const home = homedir()
  return home && p.startsWith(home) ? `~${p.slice(home.length)}` : p
}

const NONE_LABEL = "(none — ssh agent/config)"

function fileState(raw: string, hint: string) {
  const path = expandHome(raw.trim())
  if (!path) return { text: `optional — ${hint}`, color: palette.muted }
  return existsSync(path)
    ? { text: "✓ file found", color: palette.ok }
    : { text: "✗ file not found", color: palette.error }
}

/**
 * The shared config form, used by both the first-run setup and the
 * settings screen. Text fields are seeded once from the persisted profile and
 * read back via onInput. The SSH key is chosen from a fuzzy modal over the
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
  const [cloudInitFile, setCloudInitFile] = useState(init.cloudInitFile ?? "")
  const [sshKey, setSshKey] = useState<string | null>(init.sshKey ?? null)
  const [deployUser, setDeployUser] = useState(init.deployUser ?? "")
  const [shellScript, setShellScript] = useState(init.shellScript ?? "")
  const [port, setPort] = useState(String(init.port))

  const save = () =>
    onSave({
      cloudInitFile: cloudInitFile.trim() || null,
      sshKey,
      deployUser: deployUser.trim() || null,
      shellScript: shellScript.trim() || null,
      port: Number(port) || init.port,
    })

  useKeyboard((key) => {
    if (!enabled || sshPickerOpen) return // frozen while an overlay/picker owns input
    if (key.name === "escape") return onCancel()
    if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % FIELD_COUNT)
    if (key.name === "up") return setFocus((f) => (f - 1 + FIELD_COUNT) % FIELD_COUNT)
    if (key.name === "return") return focus === 1 ? setSshPickerOpen(true) : save()
  })

  const ciState = fileState(cloudInitFile, "cloud-config injected at first boot")
  const shellState = fileState(shellScript, "script run over ssh after boot")

  return (
    <box flexDirection="column" gap={1}>
      <Field label="CLOUD-INIT" focused={focus === 0}>
        <input
          focused={focus === 0 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={init.cloudInitFile ?? ""}
          placeholder="~/path/to/cloud-config.yml"
          onInput={setCloudInitFile}
        />
      </Field>
      <text fg={ciState.color}>{`  ${ciState.text}`}</text>

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
      <Field label="SHELL" focused={focus === 3}>
        <input
          focused={focus === 3 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={init.shellScript ?? ""}
          placeholder="~/path/to/setup.sh"
          onInput={setShellScript}
        />
      </Field>
      <text fg={shellState.color}>{`  ${shellState.text}`}</text>

      <Field label="PORT" focused={focus === 4}>
        <input
          focused={focus === 4 && enabled && !sshPickerOpen}
          flexGrow={1}
          value={String(init.port)}
          placeholder="2222"
          onInput={setPort}
        />
      </Field>

      <text fg={palette.muted} marginTop={1}>
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
