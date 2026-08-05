import type { Server, ServerStatus } from "../domain"
import { regionOf } from "../lib/format"
import { exec, execJSON, streamLines } from "./exec"

interface RawInstance {
  id: string
  name: string
  status: string
  zone: string
  machineType: string
  creationTimestamp: string
  networkInterfaces?: Array<{
    networkIP?: string
    accessConfigs?: Array<{ natIP?: string }>
  }>
}

const tail = (url: string) => url.slice(url.lastIndexOf("/") + 1)

const KNOWN_STATUS = new Set<ServerStatus>([
  "RUNNING",
  "PROVISIONING",
  "STAGING",
  "STOPPING",
  "TERMINATED",
  "SUSPENDED",
  "REPAIRING",
])

function toServer(raw: RawInstance): Server {
  const zone = tail(raw.zone)
  const ni = raw.networkInterfaces?.[0]
  const status = KNOWN_STATUS.has(raw.status as ServerStatus)
    ? (raw.status as ServerStatus)
    : "UNKNOWN"
  return {
    id: raw.id,
    name: raw.name,
    status,
    zone,
    region: regionOf(zone),
    machineType: tail(raw.machineType),
    externalIp: ni?.accessConfigs?.[0]?.natIP ?? null,
    internalIp: ni?.networkIP ?? null,
    createdAt: new Date(raw.creationTimestamp),
    hardened: "unknown",
  }
}

export async function fetchFleet(): Promise<Server[]> {
  const raw = await execJSON<RawInstance[]>([
    "gcloud",
    "compute",
    "instances",
    "list",
    "--format=json",
  ])
  return raw.map(toServer).sort((a, b) => a.name.localeCompare(b.name))
}

export async function currentProject(): Promise<string> {
  const { stdout } = await exec(["gcloud", "config", "get-value", "project"])
  return stdout.trim()
}

export async function listZones(): Promise<string[]> {
  const zones = await execJSON<Array<{ name: string }>>([
    "gcloud",
    "compute",
    "zones",
    "list",
    "--format=json",
  ])
  return zones.map((z) => z.name).sort()
}

export interface CreateInstanceOpts {
  name: string
  zone: string
  machineType: string
  imageFamily: string
  imageProject: string
  userDataFile?: string
  startupScriptFile?: string
  diskSizeGb?: number
  diskType?: string
  tags?: string[]
  spot?: boolean
  customCpu?: number
  customMemoryGb?: number
}

export function createArgs(opts: CreateInstanceOpts): string[] {
  const args = ["gcloud", "compute", "instances", "create", opts.name, `--zone=${opts.zone}`]
  if (opts.customCpu && opts.customMemoryGb) {
    args.push(`--custom-cpu=${opts.customCpu}`, `--custom-memory=${opts.customMemoryGb}GB`)
  } else {
    args.push(`--machine-type=${opts.machineType}`)
  }
  args.push(`--image-family=${opts.imageFamily}`, `--image-project=${opts.imageProject}`)
  if (opts.diskSizeGb) args.push(`--boot-disk-size=${opts.diskSizeGb}GB`)
  if (opts.diskType) args.push(`--boot-disk-type=${opts.diskType}`)
  if (opts.spot) args.push("--provisioning-model=SPOT")
  if (opts.tags && opts.tags.length) args.push(`--tags=${opts.tags.join(",")}`)
  const mff: string[] = []
  if (opts.userDataFile) mff.push(`user-data=${opts.userDataFile}`)
  if (opts.startupScriptFile) mff.push(`startup-script=${opts.startupScriptFile}`)
  if (mff.length) args.push("--metadata-from-file", mff.join(","))
  return args
}

export async function createInstance(
  opts: CreateInstanceOpts,
  onLog?: (line: string) => void,
): Promise<void> {
  const args = createArgs(opts)
  if (!onLog) {
    const { stderr, code } = await exec(args)
    if (code !== 0) throw new Error(stderr.trim() || `instance create failed (${code})`)
    return
  }
  onLog(`$ ${args.join(" ")}`)
  const tail: string[] = []
  const code = await streamLines(args, (line) => {
    onLog(line)
    tail.push(line)
    if (tail.length > 20) tail.shift()
  })
  if (code !== 0) throw new Error(tail.join("\n").trim() || `instance create failed (${code})`)
}
