import { cues } from "../audio/cues"
import type { Instance } from "../domain"
import { getProvider } from "../providers/registry"
import { confirm } from "./confirm"
import { logEvent, refreshFleet } from "./fleet"
import { runOp } from "./oprunner"
import { pushToast } from "./toast"

export interface VesselAction {
  id: string
  label: string
  kind: "read" | "mutate" | "destroy"
  enabled?: (i: Instance) => boolean
  confirm?: "yn" | "typed"
  billing?: string
  run: (inst: Instance) => Promise<void>
}

const isRunning = (i: Instance) => i.state === "running"

export const VESSEL_ACTIONS: VesselAction[] = [
  {
    id: "start", label: "Start", kind: "mutate", confirm: "yn",
    billing: "resumes compute billing",
    enabled: (i) => i.state === "stopped" || i.state === "terminated",
    run: (inst) => getProvider().start(inst),
  },
  {
    id: "stop", label: "Stop", kind: "mutate", confirm: "yn",
    billing: "halts compute; disks still bill",
    enabled: isRunning, run: (inst) => getProvider().stop(inst),
  },
  {
    id: "reset", label: "Reset", kind: "mutate", confirm: "yn",
    billing: "hard reboot — in-memory state lost",
    enabled: isRunning, run: (inst) => getProvider().reset(inst),
  },
  {
    id: "suspend", label: "Suspend", kind: "mutate", confirm: "yn",
    billing: "still bills saved RAM + disks",
    enabled: isRunning, run: (inst) => getProvider().suspend(inst),
  },
  {
    id: "resume", label: "Resume", kind: "mutate", confirm: "yn",
    billing: "resumes compute billing",
    enabled: (i) => i.state === "suspended", run: (inst) => getProvider().resume(inst),
  },
  {
    id: "delete", label: "Delete", kind: "destroy", confirm: "typed",
    billing: "removes vessel + boot disk (data loss)",
    run: (inst) => getProvider().delete(inst),
  },
]

export function actionsFor(inst: Instance): VesselAction[] {
  return VESSEL_ACTIONS.filter((a) => !a.enabled || a.enabled(inst))
}

export async function dispatch(action: VesselAction, inst: Instance) {
  if (action.confirm) {
    const ok = await confirm({
      title: `${action.label} ${inst.name}?`,
      message: `${action.label} ${inst.name} in ${inst.zone ?? inst.region}.`,
      billing: action.billing,
      mode: action.confirm,
      expectedName: action.confirm === "typed" ? inst.name : undefined,
    })
    if (!ok) return
  }

  logEvent({
    server: inst.name,
    level: action.kind === "destroy" ? "flare" : "caution",
    message: `${action.id} → ${inst.name}`,
  })

  const ok = await runOp(`${action.id} · ${inst.name}`, async (log) => {
    log(`${action.id} ${inst.name}…`)
    await action.run(inst)
    log("done")
  })

  if (ok) {
    cues.success()
    pushToast({ title: `${action.id} ok`, message: inst.name, variant: "success" })
    logEvent({ server: inst.name, level: "nominal", message: `${action.id} ok` })
  } else {
    cues.fail()
    pushToast({ title: `${action.id} failed`, message: inst.name, variant: "error" })
    logEvent({ server: inst.name, level: "flare", message: `${action.id} failed` })
  }
  await refreshFleet()
}
