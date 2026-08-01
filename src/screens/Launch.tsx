import { useKeyboard } from "@opentui/react"
import { useEffect, useMemo, useState } from "react"
import { listZones } from "../adapters/gcloud"
import { config } from "../config"
import { zoneLocation } from "../lib/geo"
import { Field, PickerField } from "../components/Field"
import { LogView } from "../components/LogView"
import { SearchModal, type SearchItem } from "../components/SearchModal"
import { Spinner } from "../components/Spinner"
import type { LaunchStep } from "../domain"
import { duration } from "../lib/format"
import { getProvider } from "../providers/registry"
import { TEMPLATES } from "../provisioners/templates"
import type { ProvisioningProfile } from "../provisioners/types"
import { useClock } from "../state/clock"
import { beginLaunch, launchPhase, resetLaunch, useLaunch, type LaunchSpec } from "../state/launch"
import { setScreen } from "../state/ui"
import { glyph, palette } from "../theme"

type Stage = "form" | "preflight" | "ignition"
type Picker = "zone" | "machine" | "image" | "disktype" | "firewall" | "spot" | "provision"
type Image = { label: string; family: string; project: string }
type Firewall = { http: boolean; https: boolean }

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

// fields: NAME, ZONE, MACHINE, IMAGE, DISK, DISK-TYPE, FIREWALL, SPOT, PROVISION, CONTINUE
const FIELD_COUNT = 10

const baseName = (p: string) => p.slice(p.lastIndexOf("/") + 1)

function stepGlyph(step: LaunchStep, frame: number): { icon: string; color: string } {
  switch (step.state) {
    case "running":
      return { icon: glyph.spinner[frame % glyph.spinner.length]!, color: palette.downlink }
    case "ok":
      return { icon: glyph.stepDone, color: palette.nominal }
    case "changed":
      return { icon: glyph.stepDone, color: palette.beacon }
    case "failed":
      return { icon: glyph.stepDone, color: palette.flare }
    default:
      return { icon: glyph.stepPending, color: palette.static }
  }
}

function StepRow({ step, frame }: { step: LaunchStep; frame: number }) {
  const { icon, color } = stepGlyph(step, frame)
  const label = step.role ? `${step.role} ${glyph.sep} ${step.name}` : step.name
  return (
    <box flexDirection="row" gap={1}>
      <text fg={color}>{icon}</text>
      <text fg={step.state === "running" ? palette.starlight : palette.static}>{label}</text>
      {step.durationMs !== null && step.state !== "failed" ? (
        <text fg={palette.hairline}>{duration(step.durationMs)}</text>
      ) : null}
      {step.state === "failed" && step.detail ? <text fg={palette.flare}>{step.detail}</text> : null}
    </box>
  )
}

function Ignition({ spec }: { spec: LaunchSpec }) {
  const now = useClock()
  const { phase, steps, estTotal, log } = useLaunch()
  const frame = Math.floor(now / 80)

  useEffect(() => {
    void beginLaunch(spec)
  }, [])

  const done = steps.filter((s) => s.state !== "running" && s.state !== "pending").length
  const remaining = Math.max(0, estTotal - done)
  const tLabel = phase === "running" ? `T-${remaining}` : phase === "succeeded" ? "T-0 · ORBIT" : "ABORT"
  const tColor =
    phase === "succeeded" ? palette.nominal : phase === "failed" ? palette.flare : palette.downlink

  return (
    <box flexDirection="column" flexGrow={1} gap={1}>
      <box flexDirection="row" gap={1}>
        {phase === "running" ? <Spinner color={tColor} /> : <text fg={tColor}>{glyph.stepDone}</text>}
        <text fg={tColor}>IGNITION</text>
        <text fg={palette.hairline}>{glyph.sep}</text>
        <text fg={tColor}>{tLabel}</text>
        <text fg={palette.static}>{glyph.sep} {spec.name} → {spec.zone}</text>
      </box>

      <box flexDirection="row" flexGrow={1} gap={1}>
        <box width={44} border borderStyle="rounded" borderColor={palette.hairline} title=" CHECKLIST ">
          <scrollbox flexGrow={1} stickyScroll stickyStart="bottom" paddingLeft={1} paddingRight={1}>
            {steps.map((s, i) => (
              <StepRow key={i} step={s} frame={frame} />
            ))}
          </scrollbox>
        </box>

        <LogView lines={log} title="DOWNLINK" />
      </box>

      {phase === "succeeded" || phase === "failed" ? (
        <text fg={palette.beacon}>[Enter] return to board</text>
      ) : (
        <text fg={palette.static}>running… launch is unattended, sit back</text>
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
  const [image, setImage] = useState<Image>(IMAGES[0]!)
  const [disk, setDisk] = useState("")
  const [diskType, setDiskType] = useState("")
  const [firewall, setFirewall] = useState<Firewall>({ http: false, https: false })
  const [spot, setSpot] = useState(false)
  const [provisioning, setProvisioning] = useState<ProvisioningProfile>({ name: "none", kind: "none" })

  const [diskTypeItems, setDiskTypeItems] = useState<SearchItem<string>[]>([{ value: "", label: "default (image default)" }])
  const [diskTypesLoading, setDiskTypesLoading] = useState(true)

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
        value: { name: t.id, kind: "cloud-init", userDataContent: t.cloudConfig },
        label: t.label,
        hint: "cloud-init",
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

  const buildSpec = (): LaunchSpec => ({
    name: name.trim(),
    zone,
    machineType: machine,
    imageFamily: image.family,
    imageProject: image.project,
    diskSizeGb: Number(disk) || undefined,
    diskType: diskType || undefined,
    allowHttp: firewall.http,
    allowHttps: firewall.https,
    spot,
    provisioning,
  })

  const back = () => {
    resetLaunch()
    setScreen("board")
  }

  const proceed = () => {
    if (name.trim()) setStage("preflight")
  }

  const openFocusedPicker = () => {
    if (focus === 1) setPicker("zone")
    else if (focus === 2) setPicker("machine")
    else if (focus === 3) setPicker("image")
    else if (focus === 5) setPicker("disktype")
    else if (focus === 6) setPicker("firewall")
    else if (focus === 7) setPicker("spot")
    else if (focus === 8) setPicker("provision")
    else proceed() // NAME (0), DISK (4), CONTINUE (9)
  }

  useKeyboard((key) => {
    if (picker) return // the SearchModal owns the keyboard while open

    if (stage === "ignition") {
      const phase = launchPhase()
      if (key.name === "return" && (phase === "succeeded" || phase === "failed")) back()
      return
    }
    if (key.name === "escape") return stage === "preflight" ? setStage("form") : back()
    if (stage === "form") {
      if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % FIELD_COUNT)
      if (key.name === "up") return setFocus((f) => (f - 1 + FIELD_COUNT) % FIELD_COUNT)
      if (key.name === "return") return openFocusedPicker()
      return
    }
    if (stage === "preflight" && key.name === "return") return setStage("ignition")
  })

  if (stage === "ignition") {
    return (
      <box flexDirection="column" width="100%" height="100%" padding={1} backgroundColor={palette.void}>
        <Ignition spec={buildSpec()} />
      </box>
    )
  }

  const spec = buildSpec()
  return (
    <box flexDirection="column" width="100%" height="100%" padding={2} gap={1} backgroundColor={palette.void}>
      <text fg={palette.beacon}>LAUNCH SEQUENCE {glyph.sep} {stage === "form" ? "FLIGHT PLAN" : "PRE-FLIGHT"}</text>

      {stage === "form" ? (
        <box flexDirection="column" gap={1} marginTop={1}>
          <Field label="NAME" focused={focus === 0}>
            <input focused={focus === 0 && !picker} flexGrow={1} placeholder="required" onInput={setName} />
          </Field>
          <PickerField label="ZONE" value={zone} focused={focus === 1} busy={zonesLoading} />
          <PickerField label="MACHINE" value={machine} focused={focus === 2} busy={machinesLoading} />
          <PickerField label="IMAGE" value={image.label} focused={focus === 3} />
          <Field label="DISK GB" focused={focus === 4}>
            <input focused={focus === 4 && !picker} flexGrow={1} placeholder="default (image size)" onInput={setDisk} />
          </Field>
          <PickerField label="DISK TYPE" value={diskTypeLabel} focused={focus === 5} busy={diskTypesLoading} />
          <PickerField label="FIREWALL" value={firewallLabel} focused={focus === 6} />
          <PickerField label="SPOT" value={spotLabel} focused={focus === 7} />
          <PickerField label="PROVISION" value={provisionLabel} focused={focus === 8} />

          <box flexDirection="row" gap={1} marginTop={1}>
            <text fg={focus === 9 ? palette.nominal : palette.static}>
              {focus === 9 ? glyph.arrowRight : " "} REVIEW & LAUNCH
            </text>
            {!name.trim() ? <text fg={palette.hairline}>{glyph.sep} name required</text> : null}
          </box>

          <text fg={palette.static} marginTop={1}>
            ↑↓/tab move {glyph.sep} enter {glyph.search} search / continue {glyph.sep} esc abort
          </text>
        </box>
      ) : (
        <box
          border
          borderStyle="rounded"
          borderColor={palette.downlink}
          title=" PRE-FLIGHT "
          padding={1}
          flexDirection="column"
          gap={1}
          marginTop={1}
        >
          <text fg={palette.static}>name {glyph.arrowRight} <span fg={palette.starlight}>{spec.name}</span></text>
          <text fg={palette.static}>zone {glyph.arrowRight} <span fg={palette.starlight}>{spec.zone}</span></text>
          <text fg={palette.static}>machine {glyph.arrowRight} <span fg={palette.starlight}>{spec.machineType}</span></text>
          <text fg={palette.static}>image {glyph.arrowRight} <span fg={palette.starlight}>{spec.imageFamily}</span> ({spec.imageProject})</text>
          <text fg={palette.static}>disk {glyph.arrowRight} <span fg={palette.starlight}>{disk ? `${disk} GB` : "default"}</span> {diskTypeLabel}</text>
          <text fg={palette.static}>firewall {glyph.arrowRight} <span fg={palette.starlight}>{firewallLabel}</span> {glyph.sep} {spotLabel}</text>
          <text fg={palette.static}>provision {glyph.arrowRight} <span fg={palette.starlight}>{provisionLabel}</span></text>
          <text fg={palette.beacon} marginTop={1}>[Enter] IGNITION {glyph.sep} [esc] revise</text>
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
        <SearchModal<Image>
          title="SELECT IMAGE"
          placeholder="filter images…"
          items={IMAGES.map((im): SearchItem<Image> => ({ value: im, label: im.label, hint: im.project }))}
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
      ) : null}
    </box>
  )
}
