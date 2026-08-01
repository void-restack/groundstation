import type { Server } from "../domain"

export type ProviderId = "gcp" | "aws" | "azure"

/** A normalized pickable choice — maps 1:1 onto SearchModal's SearchItem<string>. */
export interface Choice {
  value: string
  label: string
  hint?: string
}

/** The normalized create request the launch flow produces. */
export interface CreateSpec {
  name: string
  region: string
  zone?: string
  size: string
  image: string
  provisioning?: { profileName: string }
  extra?: Record<string, string>
}

/** Tells the launch form which pickers to render for THIS provider. */
export interface CreateField {
  key: "region" | "zone" | "size" | "image"
  label: string
  dependsOn?: "region"
  optional?: boolean
}

/** CLI present AND authenticated AND account resolvable. Feeds the tools doctor. */
export interface ProviderStatus {
  cliPresent: boolean
  authenticated: boolean
  account: string | null
}

/** The active identity context: project | account | subscription. */
export interface AccountContext {
  kind: "project" | "account" | "subscription"
  value: string
}

/** Enough to open an SSH session to an instance, provider-resolved. */
export interface SshTarget {
  host: string
  user: string
  identityFile: string | null
}

/**
 * One interface per cloud, sitting where the vendor adapter sits. Everything above
 * talks only to this contract. During migration it is typed against the existing
 * `Server`; Phase 1 normalizes that to `Instance`.
 */
export interface Provider {
  readonly id: ProviderId
  readonly label: string
  readonly cliBin: string

  detectConfigured(): Promise<ProviderStatus>
  account(): Promise<AccountContext>

  listInstances(): Promise<Server[]>
  describe(id: string): Promise<Server>

  create(spec: CreateSpec): Promise<{ id: string; name: string }>
  sshTarget(inst: Server): SshTarget | null

  createFields(): CreateField[]
  listRegions(): Promise<Choice[]>
  listZones(region: string): Promise<Choice[]>
  listSizes(region: string): Promise<Choice[]>
  listImages(region: string): Promise<Choice[]>
}
