import { existsSync, readFileSync } from "fs"
import { expandHome } from "../config"
import type { Provisioner, ProvisioningProfile } from "./types"

export const cloudInit: Provisioner = {
  kind: "cloud-init",
  label: "cloud-init",
  requiresTool: null,
  injectsAtCreate: true,
  buildCreatePayload(profile: ProvisioningProfile) {
    const path = expandHome(profile.userData ?? "")
    if (!path || !existsSync(path)) {
      throw new Error(`cloud-init user-data file not found: ${profile.userData ?? "(unset)"}`)
    }
    return { key: "user-data", value: readFileSync(path, "utf8") }
  },
}
