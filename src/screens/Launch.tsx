import { useKeyboard } from "@opentui/react"
import { useEffect, useState } from "react"
import { Field, SelectField } from "../components/Field"
import type { LaunchStep } from "../domain"
import { duration } from "../lib/format"
import { useClock } from "../state/clock"
import { beginLaunch, launchPhase, resetLaunch, useLaunch, type LaunchSpec } from "../state/launch"
import { setScreen } from "../state/ui"
import { glyph, palette } from "../theme"

type Stage = "form" | "preflight" | "ignition"

const ZONES = [
  "us-central1-a", "us-central1-b", "us-central1-c", "us-east1-b", "us-west1-a",
  "europe-west1-b", "europe-west4-a", "asia-south1-a", "asia-south1-b", "asia-south1-c",
  "asia-southeast1-a", "asia-northeast1-a",
]
const MACHINES = ["e2-micro", "e2-small", "e2-medium", "e2-standard-2", "e2-standard-4", "n2-standard-2", "n2-standard-4"]
const IMAGES = [
  { label: "debian-12", family: "debian-12", project: "debian-cloud" },
  { label: "debian-11", family: "debian-11", project: "debian-cloud" },
  { label: "ubuntu-22.04-lts", family: "ubuntu-2204-lts", project: "ubuntu-os-cloud" },
  { label: "ubuntu-24.04-lts", family: "ubuntu-2404-lts", project: "ubuntu-os-cloud" },
]

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

        <box flexGrow={1} border borderStyle="rounded" borderColor={palette.hairline} title=" DOWNLINK ">
          <scrollbox flexGrow={1} stickyScroll stickyStart="bottom" paddingLeft={1} paddingRight={1}>
            {log.map((line, i) => (
              <text key={i} fg={palette.static}>{line}</text>
            ))}
          </scrollbox>
        </box>
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
  const [name, setName] = useState("")
  const [zoneIdx, setZoneIdx] = useState(0)
  const [machineIdx, setMachineIdx] = useState(0)
  const [imageIdx, setImageIdx] = useState(0)

  const image = IMAGES[imageIdx]!
  const buildSpec = (): LaunchSpec => ({
    name: name.trim(),
    zone: ZONES[zoneIdx]!,
    machineType: MACHINES[machineIdx]!,
    imageFamily: image.family,
    imageProject: image.project,
  })

  const back = () => {
    resetLaunch()
    setScreen("board")
  }

  const cycle = (dir: number) => {
    if (focus === 1) setZoneIdx((i) => (i + dir + ZONES.length) % ZONES.length)
    else if (focus === 2) setMachineIdx((i) => (i + dir + MACHINES.length) % MACHINES.length)
    else if (focus === 3) setImageIdx((i) => (i + dir + IMAGES.length) % IMAGES.length)
  }

  useKeyboard((key) => {
    if (stage === "ignition") {
      const phase = launchPhase()
      if (key.name === "return" && (phase === "succeeded" || phase === "failed")) back()
      return
    }
    if (key.name === "escape") return stage === "preflight" ? setStage("form") : back()
    if (stage === "form") {
      if (key.name === "tab" || key.name === "down") return setFocus((f) => (f + 1) % 4)
      if (key.name === "up") return setFocus((f) => (f - 1 + 4) % 4)
      if (key.name === "return") return name.trim() ? setStage("preflight") : undefined
      if (focus > 0 && (key.name === "left" || key.name === "right")) return cycle(key.name === "right" ? 1 : -1)
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
            <input focused={focus === 0} flexGrow={1} placeholder="required" onInput={setName} />
          </Field>
          <SelectField label="ZONE" value={ZONES[zoneIdx]!} focused={focus === 1} />
          <SelectField label="MACHINE" value={MACHINES[machineIdx]!} focused={focus === 2} />
          <SelectField label="IMAGE" value={image.label} focused={focus === 3} />
          <text fg={palette.static} marginTop={1}>
            ↑↓/tab move {glyph.sep} ◂ ▸ change {glyph.sep} enter continue {glyph.sep} esc abort
          </text>
        </box>
      ) : (
        <box
          border
          borderStyle="double"
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
          <text fg={palette.beacon} marginTop={1}>[Enter] IGNITION {glyph.sep} [esc] revise</text>
        </box>
      )}
    </box>
  )
}
