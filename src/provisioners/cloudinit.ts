import { existsSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { expandHome } from "../config"
import type { Provisioner, ProvisioningProfile } from "./types"

export const cloudInit: Provisioner = {
  kind: "cloud-init",
  label: "cloud-init",
  requiresTool: null,
  injectsAtCreate: true,
  buildCreatePayload(profile: ProvisioningProfile) {
    // inline content (a built-in template) → materialize to a stable temp file so
    // it can ride --metadata-from-file just like a user-provided config.
    if (profile.userDataContent) {
      const path = join(tmpdir(), `gnd-cloudinit-${profile.name}.yml`)
      writeFileSync(path, profile.userDataContent)
      return { key: "user-data", value: path }
    }
    const path = expandHome(profile.userData ?? "")
    if (!path || !existsSync(path)) {
      throw new Error(`cloud-init user-data file not found: ${profile.userData ?? "(unset)"}`)
    }
    // the resolved path — providers inject it verbatim (GCP --metadata-from-file,
    // AWS --user-data file://…, Azure --custom-data).
    return { key: "user-data", value: path }
  },
}
