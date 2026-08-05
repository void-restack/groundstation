import type { ScrollBoxRenderable } from "@opentui/core"
import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { listZones } from "../adapters/gcloud"
import { config, detectPublicKeys } from "../config"
import { zoneLocation } from "../lib/geo"
import { parseLabels } from "../lib/parse"
import { Field, PickerField } from "../components/Field"
import { LogView } from "../components/LogView"
import { SearchModal, type SearchItem } from "../components/SearchModal"
import { Spinner } from "../components/Spinner"
import type { LaunchStep } from "../domain"
import { duration } from "../lib/format"
import { getProvider } from "../providers/registry"
import { TEMPLATES } from "../provisioners/templates"
import type { ProvisioningProfile } from "../provisioners/types"
import { validUsername } from "../provisioners/usersetup"
import { useClock } from "../state/clock"
import { beginLaunch, launchPhase, resetLaunch, useLaunch, type LaunchSpec } from "../state/launch"
import { setScreen } from "../state/ui"
import { glyph, palette } from "../theme"

type Stage = "form" | "review" | "creating"
type Picker =
  | "zone" | "machine" | "image" | "disktype" | "firewall" | "spot" | "provision"
  | "serviceaccount" | "scopes" | "sudo" | "sshkey"
type Section = "BASICS" | "SETUP" | "ACCESS"
type Image = { label: string; family: string; project: string }
type Firewall = { http: boolean; https: boolean }

/** One create-form field: how it renders, and which picker (if any) enter opens. */
interface FieldDesc {
  id: string
  section: Section
  picker: Picker | null
  node: (focused: boolean) => ReactNode
}

const SUBMIT = "__submit__"

const FIREWALLS: { value: Firewall; label: string }[] = [
  { value: { http: false, https: false }, label: "none" },
  { value: { http: true, https: false }, label: "http (80)" },
  { value: { http: false, https: true }, label: "https (443)" },
  { value: { http: true, https: true }, label: "http + https" },
]
const SPOTS: { value: boolean; label: string }[] = [
  { value: false, label: "standard" },
  { value: true, label: "spot (cheap, preemptible)" },
]
const SUDO_OPTS: { value: boolean; label: string }[] = [
  { value: true, label: "yes (passwordless sudo)" },
  { value: false, label: "no (standard user)" },
]
// Service-account access scopes (see research/05-sa-scope-presets.md). "" = the
// default scopes (emit no flag); "no-scopes" maps to --no-scopes in createArgs.
const SCOPE_PRESETS: SearchItem<string>[] = [
  { value: "", label: "default (recommended)", hint: "storage-ro, logging, monitoring, trace" },
  { value: "cloud-platform", label: "full access (all Cloud APIs)", hint: "pair with a custom SA + IAM roles" },
  { value: "storage-ro,compute-ro,monitoring-read", label: "read-only", hint: "read buckets, compute, metrics" },
  { value: "no-scopes", label: "locked down (no scopes)", hint: "no Google API access via the SA token" },
]
const DEFAULT_SA: SearchItem<string> = { value: "", label: "default (project SA)" }

const FALLBACK_ZONES = [
  "us-central1-a", "us-central1-b", "us-central1-c", "us-east1-b", "us-west1-a",
  "europe-west1-b", "europe-west4-a", "asia-south1-a", "asia-south1-b", "asia-south1-c",
  "asia-southeast1-a", "asia-northeast1-a",
]
const MACHINES = ["e2-micro", "e2-small", "e2-medium", "e2-standard-2", "e2-standard-4", "n2-standard-2", "n2-standard-4"]
const IMAGES: Image[] = [
  { label: "debian-12", family: "debian-12", project: "debian-cloud" },
  { label: "debian-11", family: "debian-11", project: "debian-cloud" },
  { label: "ubuntu-22.04-lts", family: "ubuntu-2204-lts", project: "ubuntu-os-cloud" },
  { label: "ubuntu-24.04-lts", family: "ubuntu-2404-lts", project: "ubuntu-os-cloud" },
]

/** Parse a "cores,GB" (or "cores GB") override into {cpu, memGb}, or null. */
function parseCustom(s: string): { cpu: number; memGb: number } | null {
  const [cpu, memGb] = s.split(/[,\s]+/).map(Number)
  return cpu && memGb && cpu > 0 && memGb > 0 ? { cpu, memGb } : null
}

const baseName = (p: string) => p.slice(p.lastIndexOf("/") + 1)

function stepGlyph(step: LaunchStep, frame: number): { icon: string; color: string } {
  switch (step.state) {
    case "running":
      return { icon: glyph.spinner[frame % glyph.spinner.length]!, color: palette.active }
    case "ok":
      return { icon: glyph.stepDone, color: palette.ok }
    case "changed":
      return { icon: glyph.stepDone, color: palette.accent }
    case "failed":
      return { icon: glyph.stepDone, color: palette.error }
    default:
      return { icon: glyph.stepPending, color: palette.muted }
  }
}

function StepRow({ step, frame }: { step: LaunchStep; frame: number }) {
  const { icon, color } = stepGlyph(step, frame)
  const label = step.role ? `${step.role} ${glyph.sep} ${step.name}` : step.name
  return (
    <box flexDirection="row" gap={1}>
      <text fg={color}>{icon}</text>
      <text fg={step.state === "running" ? palette.text : palette.muted}>{label}</text>
      {step.durationMs !== null && step.state !== "failed" ? (
        <text fg={palette.border}>{duration(step.durationMs)}</text>
      ) : null}
      {step.state === "failed" && step.detail ? <text fg={palette.error}>{step.detail}</text> : null}
    </box>
  )
}

function Creating({ spec }: { spec: LaunchSpec }) {
  const now = useClock()
  const { phase, steps, log } = useLaunch()
  const frame = Math.floor(now / 80)

  useEffect(() => {
    void beginLaunch(spec)
  }, [])

  const label = phase === "running" ? "working…" : phase === "succeeded" ? "done" : "failed"
  const color =
    phase === "succeeded" ? palette.ok : phase === "failed" ? palette.error : palette.active

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <box flexDirection="row" gap={1}>
        {phase === "running" ? <Spinner color={color} /> : <text fg={color}>{glyph.stepDone}</text>}
        <text fg={color}>CREATING</text>
        <text fg={palette.border}>{glyph.sep}</text>
        <text fg={color}>{label}</text>
        <text fg={palette.muted}>{glyph.sep} {spec.name} → {spec.zone}</text>
      </box>

      <box flexDirection="row" flexGrow={1} gap={1}>
        <box width={44} border borderStyle="rounded" borderColor={palette.border} title=" STEPS ">
          <scrollbox flexGrow={1} stickyScroll stickyStart="bottom" paddingLeft={1} paddingRight={1}>
            {steps.map((s, i) => (
              <StepRow key={i} step={s} frame={frame} />
            ))}
          </scrollbox>
        </box>

        <LogView lines={log} title="OUTPUT" />
      </box>

      {phase === "succeeded" || phase === "failed" ? (
        <text fg={palette.accent}>[Enter] back to the board</text>
      ) : (
        <text fg={palette.muted}>running… you can leave this; it finishes on its own</text>
      )}
    </box>
  )
}

export function Launch() {
  const [stage, setStage] = useState<Stage>("form")
  const [focus, setFocus] = useState(0)
  const [picker, setPicker] = useState<Picker | null>(null)
  const [name, setName] = useState("")
  const [zone, setZone] = useState(FALLBACK_ZONES[0]!)
  const [machine, setMachine] = useState(MACHINES[0]!)
  const [custom, setCustom] = useState("")
  const [image, setImage] = useState(`${IMAGES[0]!.family}|${IMAGES[0]!.project}`)
  const [disk, setDisk] = useState("")
  const [diskType, setDiskType] = useState("")
  const [firewall, setFirewall] = useState<Firewall>({ http: false, https: false })
  const [spot, setSpot] = useState(false)
  const [provisioning, setProvisioning] = useState<ProvisioningProfile>({ name: "none", kind: "none" })
  const [labelsInput, setLabelsInput] = useState("")
  const [serviceAccount, setServiceAccount] = useState("")
  const [scopes, setScopes] = useState("")
  const [saItems, setSaItems] = useState<SearchItem<string>[]>([DEFAULT_SA])
  const [saLoading, setSaLoading] = useState(true)
  const [user, setUser] = useState("")
  const [sudo, setSudo] = useState(true)
  const pubKeyItems = useMemo<SearchItem<string>[]>(
    () => detectPublicKeys().map((k) => ({ value: k.path, label: k.label })),
    [],
  )
  const [sshKeyPath, setSshKeyPath] = useState<string>(
    () => pubKeyItems.find((k) => k.label === "google_compute_engine.pub")?.value ?? pubKeyItems[0]?.value ?? "",
  )
  const sudoLabel = sudo ? "yes (passwordless sudo)" : "no (standard user)"
  const sshKeyLabel = pubKeyItems.find((k) => k.value === sshKeyPath)?.label ?? "none"
  const userValid = !user.trim() || validUsername(user.trim())
  const userNeedsKey = Boolean(user.trim()) && !sshKeyPath
  const labels = parseLabels(labelsInput)
  const scopeLabel = SCOPE_PRESETS.find((p) => p.value === scopes)?.label ?? scopes
  const saLabel = saItems.find((s) => s.value === serviceAccount)?.label ?? (serviceAccount || DEFAULT_SA.label)

  // A custom SA with the default (limited) scopes silently 403s on IAM-granted
  // APIs; the recommended pattern is a custom SA + cloud-platform. Nudge there.
  const pickServiceAccount = (v: string) => {
    setServiceAccount(v)
    if (v && scopes === "") setScopes("cloud-platform")
  }

  const [diskTypeItems, setDiskTypeItems] = useState<SearchItem<string>[]>([{ value: "", label: "default (image default)" }])
  const [diskTypesLoading, setDiskTypesLoading] = useState(true)
  const [imageItems, setImageItems] = useState<SearchItem<string>[]>(
    IMAGES.map((im) => ({ value: `${im.family}|${im.project}`, label: im.label, hint: im.project })),
  )
  const [imagesLoading, setImagesLoading] = useState(true)
  const imageLabel = imageItems.find((i) => i.value === image)?.label ?? image.split("|")[0] ?? image

  const firewallLabel =
    FIREWALLS.find((f) => f.value.http === firewall.http && f.value.https === firewall.https)?.label ?? "none"
  const diskTypeLabel = diskTypeItems.find((d) => d.value === diskType)?.label ?? (diskType || "default")
  const spotLabel = SPOTS.find((s) => s.value === spot)?.label ?? "standard"

  const [zones, setZones] = useState<string[]>(FALLBACK_ZONES)
  const [zonesLoading, setZonesLoading] = useState(true)
  const [machineItems, setMachineItems] = useState<SearchItem<string>[]>(MACHINES.map((m) => ({ value: m, label: m })))
  const [machinesLoading, setMachinesLoading] = useState(true)

  const provisionItems = useMemo<SearchItem<ProvisioningProfile>[]>(() => {
    const items: SearchItem<ProvisioningProfile>[] = [
      { value: { name: "none", kind: "none" }, label: "none — bare box" },
    ]
    for (const t of TEMPLATES) {
      items.push({
        value: { name: t.id, kind: "cloud-init", userDataContent: t.content },
        label: t.label,
        hint: "recipe",
      })
    }
    if (config.cloudInitFile) {
      items.push({
        value: { name: "cloud-init-file", kind: "cloud-init", userData: config.cloudInitFile },
        label: "my cloud-init file",
        hint: baseName(config.cloudInitFile),
      })
    }
    if (config.shellScript) {
      items.push({
        value: { name: "shell", kind: "shell", script: config.shellScript },
        label: "my shell script",
        hint: baseName(config.shellScript),
      })
    }
    return items
  }, [])
  const provisionLabel = provisionItems.find((i) => i.value.name === provisioning.name)?.label ?? provisioning.name

  useEffect(() => {
    let alive = true
    listZones()
      .then((zs) => {
        if (alive && zs.length) setZones(zs)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setZonesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    setMachinesLoading(true)
    getProvider()
      .listSizes(zone)
      .then((sizes) => {
        if (alive && sizes.length) setMachineItems(sizes)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setMachinesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [zone])

  useEffect(() => {
    let alive = true
    setDiskTypesLoading(true)
    getProvider()
      .listDiskTypes(zone)
      .then((types) => {
        if (alive && types.length) setDiskTypeItems(types)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setDiskTypesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [zone])

  useEffect(() => {
    let alive = true
    getProvider()
      .listImages("")
      .then((imgs) => {
        if (alive && imgs.length) setImageItems(imgs)
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setImagesLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    getProvider()
      .listServiceAccounts()
      .then((accts) => {
        if (alive && accts.length) setSaItems([DEFAULT_SA, ...accts])
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setSaLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const cx = parseCustom(custom)
  const [imgFamily = "", imgProject = ""] = image.split("|")
  const buildSpec = (): LaunchSpec => ({
    name: name.trim(),
    zone,
    machineType: machine,
    customCpu: cx?.cpu,
    customMemoryGb: cx?.memGb,
    imageFamily: imgFamily,
    imageProject: imgProject,
    diskSizeGb: Number(disk) || undefined,
    diskType: diskType || undefined,
    allowHttp: firewall.http,
    allowHttps: firewall.https,
    spot,
    labels: Object.keys(labels).length ? labels : undefined,
    serviceAccount: serviceAccount || undefined,
    scopes: scopes || undefined,
    provisioning,
    userSetup:
      user.trim() && validUsername(user.trim()) && sshKeyPath
        ? { username: user.trim(), sudo, publicKeyPath: sshKeyPath }
        : undefined,
  })

  // The form is a flat, sectioned descriptor list; focus, render, and picker
  // routing all derive from it, so a new field is one entry — no index renumbering.
  const descriptors: FieldDesc[] = [
    {
      id: "name", section: "BASICS", picker: null,
      node: (f) => (
        <Field label="NAME" focused={f}>
          <input focused={f && !picker} flexGrow={1} placeholder="required" onInput={setName} />
        </Field>
      ),
    },
    { id: "zone", section: "BASICS", picker: "zone", node: (f) => <PickerField label="ZONE" value={zone} focused={f} busy={zonesLoading} /> },
    {
      id: "machine", section: "BASICS", picker: "machine",
      node: (f) => <PickerField label="MACHINE" value={cx ? `custom ${cx.cpu}c/${cx.memGb}g` : machine} focused={f} busy={machinesLoading} />,
    },
    {
      id: "custom", section: "BASICS", picker: null,
      node: (f) => (
        <Field label="CUSTOM" focused={f}>
          <input focused={f && !picker} flexGrow={1} placeholder="optional — override cores,GB e.g. 4,8" onInput={setCustom} />
        </Field>
      ),
    },
    { id: "image", section: "BASICS", picker: "image", node: (f) => <PickerField label="IMAGE" value={imageLabel} focused={f} busy={imagesLoading} /> },
    {
      id: "disk", section: "BASICS", picker: null,
      node: (f) => (
        <Field label="DISK GB" focused={f}>
          <input focused={f && !picker} flexGrow={1} placeholder="default (image size)" onInput={setDisk} />
        </Field>
      ),
    },
    { id: "disktype", section: "BASICS", picker: "disktype", node: (f) => <PickerField label="DISK TYPE" value={diskTypeLabel} focused={f} busy={diskTypesLoading} /> },
    { id: "firewall", section: "BASICS", picker: "firewall", node: (f) => <PickerField label="FIREWALL" value={firewallLabel} focused={f} /> },
    { id: "spot", section: "BASICS", picker: "spot", node: (f) => <PickerField label="SPOT" value={spotLabel} focused={f} /> },
    {
      id: "labels", section: "BASICS", picker: null,
      node: (f) => (
        <Field label="LABELS" focused={f}>
          <input focused={f && !picker} flexGrow={1} placeholder="optional — key=value pairs e.g. env=prod team=core" onInput={setLabelsInput} />
        </Field>
      ),
    },

    { id: "provision", section: "SETUP", picker: "provision", node: (f) => <PickerField label="PROVISION" value={provisionLabel} focused={f} /> },

    { id: "serviceaccount", section: "ACCESS", picker: "serviceaccount", node: (f) => <PickerField label="SVC ACCT" value={saLabel} focused={f} busy={saLoading} /> },
    { id: "scopes", section: "ACCESS", picker: "scopes", node: (f) => <PickerField label="SCOPES" value={scopeLabel} focused={f} /> },
    {
      id: "user", section: "ACCESS", picker: null,
      node: (f) => (
        <Field label="USER" focused={f}>
          <input focused={f && !picker} flexGrow={1} placeholder="optional — create a login user e.g. deploy" onInput={setUser} />
        </Field>
      ),
    },
    { id: "sudo", section: "ACCESS", picker: "sudo", node: (f) => <PickerField label="SUDO" value={user.trim() ? sudoLabel : "—"} focused={f} /> },
    { id: "sshkey", section: "ACCESS", picker: "sshkey", node: (f) => <PickerField label="SSH KEY" value={user.trim() ? sshKeyLabel : "—"} focused={f} /> },
  ]

  const focusIds = [...descriptors.map((d) => d.id), SUBMIT]
  const focusedId = focusIds[Math.min(focus, focusIds.length - 1)] ?? SUBMIT

  const scrollRef = useRef<ScrollBoxRenderable | null>(null)
  useEffect(() => {
    if (stage !== "form") return
    const id = setTimeout(() => scrollRef.current?.scrollChildIntoView(`fld-${focusedId}`), 0)
    return () => clearTimeout(id)
  }, [focusedId, stage])
  useEffect(() => {
    setFocus((f) => Math.min(f, focusIds.length - 1))
  }, [focusIds.length])

  const back = () => {
    resetLaunch()
    setScreen("board")
  }

  const proceed = () => {
    if (!name.trim() || !userValid || userNeedsKey) return
    setStage("review")
  }

  const openFocusedPicker = () => {
    if (focusedId === SUBMIT) return proceed()
    const d = descriptors.find((x) => x.id === focusedId)
    if (d?.picker) return setPicker(d.picker)
    return proceed()
  }

  useKeyboard((key) => {
    if (picker) return // the SearchModal owns the keyboard while open

    if (stage === "creating") {
      const phase = launchPhase()
      if (key.name === "return" && (phase === "succeeded" || phase === "failed")) back()
      return
    }
    if (key.name === "escape") return stage === "review" ? setStage("form") : back()
    if (stage === "form") {
      if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % focusIds.length)
      if (key.name === "up") return setFocus((f) => (f - 1 + focusIds.length) % focusIds.length)
      if (key.name === "return") return openFocusedPicker()
      return
    }
    if (stage === "review" && key.name === "return") return setStage("creating")
  })

  if (stage === "creating") {
    return (
      <box flexDirection="column" width="100%" height="100%" padding={1} backgroundColor={palette.bg}>
        <Creating spec={buildSpec()} />
      </box>
    )
  }

  const validationHint = !name.trim() ? (
    <text fg={palette.border}>{glyph.sep} name required</text>
  ) : !userValid ? (
    <text fg={palette.border}>{glyph.sep} user must be a valid linux name</text>
  ) : userNeedsKey ? (
    <text fg={palette.border}>{glyph.sep} pick an ssh key for the user</text>
  ) : null

  const rows: ReactNode[] = []
  let lastSection: Section | null = null
  for (const d of descriptors) {
    if (d.section !== lastSection) {
      rows.push(
        <text key={`sec-${d.section}`} fg={palette.muted} marginTop={lastSection ? 1 : 0}>
          {d.section}
        </text>,
      )
      lastSection = d.section
    }
    rows.push(
      <box key={d.id} id={`fld-${d.id}`}>
        {d.node(d.id === focusedId)}
      </box>,
    )
  }
  rows.push(
    <box key={SUBMIT} id={`fld-${SUBMIT}`} flexDirection="row" gap={1} marginTop={1}>
      <text fg={focusedId === SUBMIT ? palette.ok : palette.muted}>
        {focusedId === SUBMIT ? glyph.arrowRight : " "} REVIEW & CREATE
      </text>
      {validationHint}
    </box>,
  )

  const spec = buildSpec()
  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.bg}>
      <text fg={palette.accent}>NEW INSTANCE {glyph.sep} {stage === "form" ? "DETAILS" : "REVIEW"}</text>

      {stage === "form" ? (
        <>
          <scrollbox ref={scrollRef} flexGrow={1} paddingRight={1}>
            {rows}
          </scrollbox>
          <text fg={palette.muted}>
            ↑↓/tab move {glyph.sep} enter {glyph.search} search / continue {glyph.sep} esc back
          </text>
        </>
      ) : (
        <box
          border
          borderStyle="rounded"
          borderColor={palette.active}
          title=" REVIEW "
          paddingLeft={1}
          paddingRight={1}
          flexDirection="column"
          flexGrow={1}
          marginTop={1}
        >
          <scrollbox flexGrow={1}>
            <text fg={palette.muted}>name {glyph.arrowRight} <span fg={palette.text}>{spec.name}</span></text>
            <text fg={palette.muted}>zone {glyph.arrowRight} <span fg={palette.text}>{spec.zone}</span></text>
            <text fg={palette.muted}>machine {glyph.arrowRight} <span fg={palette.text}>{cx ? `custom ${cx.cpu} vCPU / ${cx.memGb} GB` : spec.machineType}</span></text>
            <text fg={palette.muted}>image {glyph.arrowRight} <span fg={palette.text}>{spec.imageFamily}</span> ({spec.imageProject})</text>
            <text fg={palette.muted}>disk {glyph.arrowRight} <span fg={palette.text}>{disk ? `${disk} GB` : "default"}</span> {diskTypeLabel}</text>
            <text fg={palette.muted}>firewall {glyph.arrowRight} <span fg={palette.text}>{firewallLabel}</span> {glyph.sep} {spotLabel}</text>
            {Object.keys(labels).length ? (
              <text fg={palette.muted}>labels {glyph.arrowRight} <span fg={palette.text}>{Object.entries(labels).map(([k, v]) => `${k}=${v}`).join(" ")}</span></text>
            ) : null}
            <text fg={palette.muted}>svc acct {glyph.arrowRight} <span fg={palette.text}>{saLabel}</span> {glyph.sep} scopes {scopeLabel}</text>
            <text fg={palette.muted}>provision {glyph.arrowRight} <span fg={palette.text}>{provisionLabel}</span></text>
            {spec.userSetup ? (
              <text fg={palette.muted}>user {glyph.arrowRight} <span fg={palette.text}>{spec.userSetup.username}</span> {sudo ? "(sudo)" : "(no sudo)"} {glyph.sep} key {sshKeyLabel}</text>
            ) : null}
          </scrollbox>
          <text fg={palette.accent}>[Enter] create {glyph.sep} [esc] back</text>
        </box>
      )}

      {picker === "zone" ? (
        <SearchModal<string>
          title="SELECT ZONE"
          placeholder={zonesLoading ? "loading zones…" : "filter by zone or city…"}
          items={zones.map((z) => ({ value: z, label: z, hint: zoneLocation(z) }))}
          onPick={setZone}
          onClose={() => setPicker(null)}
        />
      ) : picker === "machine" ? (
        <SearchModal<string>
          title="SELECT MACHINE TYPE"
          placeholder={machinesLoading ? "loading machine types…" : "filter — e2, n2, highmem, cores…"}
          items={machineItems}
          onPick={setMachine}
          onClose={() => setPicker(null)}
        />
      ) : picker === "image" ? (
        <SearchModal<string>
          title="SELECT IMAGE"
          placeholder={imagesLoading ? "loading images…" : "filter — debian, ubuntu, cos, rocky…"}
          items={imageItems}
          onPick={setImage}
          onClose={() => setPicker(null)}
        />
      ) : picker === "disktype" ? (
        <SearchModal<string>
          title="SELECT DISK TYPE"
          placeholder={diskTypesLoading ? "loading disk types…" : "standard · balanced · ssd…"}
          items={diskTypeItems}
          onPick={setDiskType}
          onClose={() => setPicker(null)}
        />
      ) : picker === "firewall" ? (
        <SearchModal<Firewall>
          title="SELECT FIREWALL"
          placeholder="none · http · https…"
          items={FIREWALLS}
          onPick={setFirewall}
          onClose={() => setPicker(null)}
        />
      ) : picker === "spot" ? (
        <SearchModal<boolean>
          title="SELECT PROVISIONING MODEL"
          placeholder="standard · spot…"
          items={SPOTS}
          onPick={setSpot}
          onClose={() => setPicker(null)}
        />
      ) : picker === "provision" ? (
        <SearchModal<ProvisioningProfile>
          title="SELECT PROVISIONING"
          placeholder="none · templates · your files…"
          items={provisionItems}
          onPick={setProvisioning}
          onClose={() => setPicker(null)}
        />
      ) : picker === "serviceaccount" ? (
        <SearchModal<string>
          title="SELECT SERVICE ACCOUNT"
          placeholder={saLoading ? "loading service accounts…" : "default (project SA) · a custom SA…"}
          items={saItems}
          onPick={pickServiceAccount}
          onClose={() => setPicker(null)}
        />
      ) : picker === "scopes" ? (
        <SearchModal<string>
          title="SELECT ACCESS SCOPES"
          placeholder="default · full · read-only · locked…"
          items={SCOPE_PRESETS}
          onPick={setScopes}
          onClose={() => setPicker(null)}
        />
      ) : picker === "sudo" ? (
        <SearchModal<boolean>
          title="SUDO FOR NEW USER"
          placeholder="passwordless sudo · standard…"
          items={SUDO_OPTS}
          onPick={setSudo}
          onClose={() => setPicker(null)}
        />
      ) : picker === "sshkey" ? (
        <SearchModal<string>
          title="AUTHORIZE SSH KEY"
          placeholder={pubKeyItems.length ? "pick a public key…" : "no ~/.ssh/*.pub found"}
          items={pubKeyItems}
          onPick={setSshKeyPath}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </box>
  )
}
