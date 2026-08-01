import type { ProviderId } from "./providers/types"

export type ServerStatus =
  | "RUNNING"
  | "PROVISIONING"
  | "STAGING"
  | "STOPPING"
  | "TERMINATED"
  | "SUSPENDED"
  | "REPAIRING"
  | "UNKNOWN"

export type HardenedState = "hardened" | "soft" | "unknown"

export interface Server {
  id: string
  name: string
  status: ServerStatus
  zone: string
  region: string
  flightCode: string
  machineType: string
  externalIp: string | null
  internalIp: string | null
  createdAt: Date
  hardened: HardenedState
}

export type InstanceState =
  | "running"
  | "provisioning"
  | "starting"
  | "stopping"
  | "stopped"
  | "terminated"
  | "suspended"
  | "repairing"
  | "unknown"

export interface Instance {
  provider: ProviderId
  id: string
  name: string
  account: string
  state: InstanceState
  rawState: string
  region: string
  zone: string | null
  flightCode: string
  size: string
  image: string | null
  externalIp: string | null
  internalIp: string | null
  createdAt: Date
  hardened: HardenedState
  extra: Record<string, string>
  raw: unknown
}

export interface FleetEvent {
  id: string
  at: Date
  server: string | null
  level: "info" | "nominal" | "caution" | "flare"
  message: string
}

export type LaunchStepState = "pending" | "running" | "ok" | "changed" | "skipped" | "failed"

export interface LaunchStep {
  name: string
  role: string | null
  state: LaunchStepState
  durationMs: number | null
  detail: string | null
}

export type LaunchPhase = "idle" | "running" | "succeeded" | "failed"
