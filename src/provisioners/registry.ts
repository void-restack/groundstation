import { cloudInit } from "./cloudinit"
import { none } from "./none"
import type { Provisioner, ProvisionerKind } from "./types"

const REGISTRY = new Map<ProvisionerKind, Provisioner>([
  [none.kind, none],
  [cloudInit.kind, cloudInit],
])

export function getProvisioner(kind: ProvisionerKind): Provisioner {
  const provisioner = REGISTRY.get(kind)
  if (!provisioner) throw new Error(`provisioner not registered: ${kind}`)
  return provisioner
}

export function registeredProvisioners(): Provisioner[] {
  return [...REGISTRY.values()]
}
