import { config } from "../../config"
import type { Server } from "../../domain"
import { createInstance, currentProject, fetchFleet, listZones } from "../../adapters/gcloud"
import { regionOf } from "../../lib/format"
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

/** The image Choice value carries `family|project`; unpack it (extra overrides). */
function unpackImage(image: string, extra?: Record<string, string>): { family: string; project: string } {
  const [family, encoded] = image.split("|")
  const fam = family ?? image
  const project = extra?.["gcp.imageProject"] ?? encoded ?? IMAGE_PROJECTS[fam.split("-")[0]!] ?? "debian-cloud"
  return { family: fam, project }
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

  listInstances(): Promise<Server[]> {
    return fetchFleet()
  },

  async describe(id: string): Promise<Server> {
    const found = (await fetchFleet()).find((s) => s.id === id || s.name === id)
    if (!found) throw new Error(`no such vessel: ${id}`)
    return found
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
    })
    return { id: spec.name, name: spec.name }
  },

  sshTarget(inst: Server): SshTarget | null {
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
    return regions.map((r) => ({ value: r, label: r }))
  },

  async listZones(region: string): Promise<Choice[]> {
    const zones = await listZones()
    const scoped = region ? zones.filter((z) => z.startsWith(`${region}-`)) : zones
    return scoped.map((z) => ({ value: z, label: z }))
  },

  async listSizes(): Promise<Choice[]> {
    return MACHINE_TYPES.map((m) => ({ value: m, label: m }))
  },

  async listImages(): Promise<Choice[]> {
    return IMAGES.map((im) => ({ value: `${im.family}|${im.project}`, label: im.family, hint: im.project }))
  },
}
