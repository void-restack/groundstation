import { config } from "../../config"
import type { Instance, InstanceState, Server, ServerStatus } from "../../domain"
import { exec, execJSON } from "../../adapters/exec"
import { createInstance, currentProject, fetchFleet, listZones } from "../../adapters/gcloud"
import { regionOf } from "../../lib/format"
import { regionLocation, zoneLocation } from "../../lib/geo"
import type {
  AccountContext,
  Choice,
  CreateField,
  CreateSpec,
  Provider,
  ProviderStatus,
  SshTarget,
} from "../types"

const MACHINE_TYPES = [
  "e2-micro",
  "e2-small",
  "e2-medium",
  "e2-standard-2",
  "e2-standard-4",
  "n2-standard-2",
  "n2-standard-4",
]

const IMAGES: Array<{ family: string; project: string }> = [
  { family: "debian-12", project: "debian-cloud" },
  { family: "debian-11", project: "debian-cloud" },
  { family: "ubuntu-2204-lts", project: "ubuntu-os-cloud" },
  { family: "ubuntu-2404-lts", project: "ubuntu-os-cloud" },
]

const IMAGE_PROJECTS: Record<string, string> = {
  debian: "debian-cloud",
  ubuntu: "ubuntu-os-cloud",
}

const STATE_MAP: Record<ServerStatus, InstanceState> = {
  RUNNING: "running",
  PROVISIONING: "provisioning",
  STAGING: "starting",
  STOPPING: "stopping",
  TERMINATED: "terminated",
  SUSPENDED: "suspended",
  REPAIRING: "repairing",
  UNKNOWN: "unknown",
}

export function serverToInstance(s: Server, account: string): Instance {
  return {
    provider: "gcp",
    id: s.id,
    name: s.name,
    account,
    state: STATE_MAP[s.status],
    rawState: s.status,
    region: s.region,
    zone: s.zone,
    flightCode: s.flightCode,
    size: s.machineType,
    image: null,
    externalIp: s.externalIp,
    internalIp: s.internalIp,
    createdAt: s.createdAt,
    hardened: s.hardened,
    extra: {},
    raw: s,
  }
}

/** The image Choice value carries `family|project`; unpack it (extra overrides). */
function unpackImage(image: string, extra?: Record<string, string>): { family: string; project: string } {
  const [family, encoded] = image.split("|")
  const fam = family ?? image
  const project = extra?.["gcp.imageProject"] ?? encoded ?? IMAGE_PROJECTS[fam.split("-")[0]!] ?? "debian-cloud"
  return { family: fam, project }
}

export type LifecycleVerb = "start" | "stop" | "reset" | "suspend" | "resume" | "delete"

export function lifecycleArgs(verb: LifecycleVerb, inst: Instance): string[] {
  const args = ["gcloud", "compute", "instances", verb, inst.name]
  if (inst.zone) args.push(`--zone=${inst.zone}`)
  args.push("--quiet")
  return args
}

async function runLifecycle(verb: LifecycleVerb, inst: Instance): Promise<void> {
  const { stderr, code } = await exec(lifecycleArgs(verb, inst))
  if (code !== 0) throw new Error(stderr.trim() || `${verb} ${inst.name} failed (${code})`)
}

export const gcp: Provider = {
  id: "gcp",
  label: "Google Cloud",
  cliBin: "gcloud",

  async detectConfigured(): Promise<ProviderStatus> {
    if (!Bun.which("gcloud")) return { cliPresent: false, authenticated: false, account: null }
    const project = await currentProject().catch(() => "")
    return { cliPresent: true, authenticated: project.length > 0, account: project || null }
  },

  async account(): Promise<AccountContext> {
    return { kind: "project", value: await currentProject() }
  },

  async listAccounts(): Promise<Choice[]> {
    const projects = await execJSON<Array<{ projectId: string; name?: string }>>([
      "gcloud", "projects", "list", "--format=json",
    ])
    return projects
      .map((p) => ({ value: p.projectId, label: p.projectId, hint: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  },

  async setAccount(value: string): Promise<void> {
    const { stderr, code } = await exec(["gcloud", "config", "set", "project", value])
    if (code !== 0) throw new Error(stderr.trim() || `set project failed (${code})`)
  },

  authCommand(): string[] {
    return ["gcloud", "auth", "login"]
  },

  async listInstances(): Promise<Instance[]> {
    const [servers, account] = await Promise.all([fetchFleet(), currentProject().catch(() => "")])
    return servers.map((s) => serverToInstance(s, account))
  },

  async describe(id: string): Promise<Instance> {
    const [servers, account] = await Promise.all([fetchFleet(), currentProject().catch(() => "")])
    const found = servers.find((s) => s.id === id || s.name === id)
    if (!found) throw new Error(`no such vessel: ${id}`)
    return serverToInstance(found, account)
  },

  async serialConsole(inst: Instance): Promise<string> {
    const args = ["gcloud", "compute", "instances", "get-serial-port-output", inst.name]
    if (inst.zone) args.push(`--zone=${inst.zone}`)
    const { stdout, stderr, code } = await exec(args)
    if (code !== 0) throw new Error(stderr.trim() || `serial console failed (${code})`)
    return stdout
  },

  async create(spec: CreateSpec): Promise<{ id: string; name: string }> {
    const zone = spec.zone ?? spec.region
    if (!zone) throw new Error("gcp create requires a zone")
    const { family, project } = unpackImage(spec.image, spec.extra)
    await createInstance({
      name: spec.name,
      zone,
      machineType: spec.size,
      imageFamily: family,
      imageProject: project,
      userDataFile: spec.extra?.["user-data"],
    })
    return { id: spec.name, name: spec.name }
  },

  start: (inst) => runLifecycle("start", inst),
  stop: (inst) => runLifecycle("stop", inst),
  reset: (inst) => runLifecycle("reset", inst),
  suspend: (inst) => runLifecycle("suspend", inst),
  resume: (inst) => runLifecycle("resume", inst),
  delete: (inst) => runLifecycle("delete", inst),

  sshTarget(inst: Instance): SshTarget | null {
    if (!inst.externalIp) return null
    return { host: inst.externalIp, user: config.deployUser, identityFile: config.sshKey }
  },

  createFields(): CreateField[] {
    return [
      { key: "zone", label: "ZONE" },
      { key: "size", label: "MACHINE" },
      { key: "image", label: "IMAGE" },
    ]
  },

  async listRegions(): Promise<Choice[]> {
    const regions = [...new Set((await listZones()).map(regionOf))].sort()
    return regions.map((r) => ({ value: r, label: r, hint: regionLocation(r) }))
  },

  async listZones(region: string): Promise<Choice[]> {
    const zones = await listZones()
    const scoped = region ? zones.filter((z) => z.startsWith(`${region}-`)) : zones
    return scoped.map((z) => ({ value: z, label: z, hint: zoneLocation(z) }))
  },

  async listSizes(): Promise<Choice[]> {
    return MACHINE_TYPES.map((m) => ({ value: m, label: m }))
  },

  async listImages(): Promise<Choice[]> {
    return IMAGES.map((im) => ({ value: `${im.family}|${im.project}`, label: im.family, hint: im.project }))
  },
}
