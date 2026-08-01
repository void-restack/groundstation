import type { Instance } from "../domain"

export type ProviderId = "gcp" | "aws" | "azure"

export interface Choice {
  value: string
  label: string
  hint?: string
}

export interface CreateSpec {
  name: string
  region: string
  zone?: string
  size: string
  image: string
  diskSizeGb?: number
  allowHttp?: boolean
  allowHttps?: boolean
  provisioning?: { profileName: string }
  extra?: Record<string, string>
}

export interface CreateField {
  key: "region" | "zone" | "size" | "image"
  label: string
  dependsOn?: "region"
  optional?: boolean
}

export interface ProviderStatus {
  cliPresent: boolean
  authenticated: boolean
  account: string | null
}

export interface AccountContext {
  kind: "project" | "account" | "subscription"
  value: string
}

export interface SshTarget {
  host: string
  user: string
  identityFile: string | null
}

export interface Provider {
  readonly id: ProviderId
  readonly label: string
  readonly cliBin: string

  detectConfigured(): Promise<ProviderStatus>
  account(): Promise<AccountContext>
  listAccounts(): Promise<Choice[]>
  setAccount(value: string): Promise<void>
  authCommand(): string[]

  listInstances(): Promise<Instance[]>
  describe(id: string): Promise<Instance>
  serialConsole(inst: Instance): Promise<string>

  create(spec: CreateSpec): Promise<{ id: string; name: string }>
  sshCommand(inst: Instance): string[]
  start(inst: Instance): Promise<void>
  stop(inst: Instance): Promise<void>
  reset(inst: Instance): Promise<void>
  suspend(inst: Instance): Promise<void>
  resume(inst: Instance): Promise<void>
  delete(inst: Instance): Promise<void>
  sshTarget(inst: Instance): SshTarget | null

  createFields(): CreateField[]
  listRegions(): Promise<Choice[]>
  listZones(region: string): Promise<Choice[]>
  listSizes(region: string): Promise<Choice[]>
  listImages(region: string): Promise<Choice[]>
}
