import { existsSync } from "fs"
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
    // the resolved path — providers inject it verbatim (GCP --metadata-from-file,
    // AWS --user-data file://…, Azure --custom-data).
    return { key: "user-data", value: path }
  },
}
