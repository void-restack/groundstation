import type { Instance } from "../domain"
import type { Provider } from "../providers/types"

export type ProvisionerKind = "none" | "cloud-init" | "shell" | "command"

export type ProvisionEvent =
  | { type: "task"; name: string; role: string | null }
  | { type: "result"; state: "ok" | "changed" | "skipped" | "failed"; host: string; detail?: string }
  | { type: "log"; line: string }

export interface ProvisioningProfile {
  name: string
  kind: ProvisionerKind
  playbook?: string
  dir?: string
  script?: string
  command?: string
  userData?: string
  bootstrapUser?: string
  vars?: Record<string, string>
}

export interface ProvisionContext {
  instance: Instance
  profile: ProvisioningProfile
  provider: Provider
}

export interface Provisioner {
  readonly kind: ProvisionerKind
  readonly label: string
  readonly requiresTool: string | null
  readonly injectsAtCreate: boolean

  buildCreatePayload?(profile: ProvisioningProfile): { key: string; value: string }
  run?(ctx: ProvisionContext, onEvent: (e: ProvisionEvent) => void): Promise<boolean>
  plan?(ctx: ProvisionContext): Promise<string[]>
}
