import { gcp } from "./gcp"
import type { Provider, ProviderId } from "./types"

const REGISTRY = new Map<ProviderId, Provider>([[gcp.id, gcp]])

/** The sole provider today; config-driven selection arrives with multi-cloud. */
export const DEFAULT_PROVIDER: ProviderId = "gcp"

export function getProvider(id: ProviderId = DEFAULT_PROVIDER): Provider {
  const provider = REGISTRY.get(id)
  if (!provider) throw new Error(`provider not registered: ${id}`)
  return provider
}

export function registeredProviders(): Provider[] {
  return [...REGISTRY.values()]
}
