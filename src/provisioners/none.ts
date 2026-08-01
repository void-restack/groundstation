import type { Provisioner } from "./types"

export const none: Provisioner = {
  kind: "none",
  label: "none — bare box",
  requiresTool: null,
  injectsAtCreate: false,
}
