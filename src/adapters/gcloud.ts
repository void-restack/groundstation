import type { Server, ServerStatus } from "../domain"
import { flightCode, regionOf } from "../lib/format"
import { exec, execJSON } from "./exec"

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
    flightCode: flightCode(zone),
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

export async function createInstance(opts: {
  name: string
  zone: string
  machineType: string
  imageFamily: string
  imageProject: string
}): Promise<void> {
  const { stderr, code } = await exec([
    "gcloud",
    "compute",
    "instances",
    "create",
    opts.name,
    `--zone=${opts.zone}`,
    `--machine-type=${opts.machineType}`,
    `--image-family=${opts.imageFamily}`,
    `--image-project=${opts.imageProject}`,
  ])
  if (code !== 0) throw new Error(stderr.trim() || `instance create failed (${code})`)
}
