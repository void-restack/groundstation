import { existsSync, readFileSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { expandHome } from "../config"
import type { Provisioner, ProvisioningProfile } from "./types"

/** A bash script (#!) → GCP startup-script; a #cloud-config → cloud-init user-data. */
const metadataKey = (content: string) =>
  content.trimStart().startsWith("#!") ? "startup-script" : "user-data"

export const cloudInit: Provisioner = {
  kind: "cloud-init",
  label: "boot config",
  requiresTool: null,
  injectsAtCreate: true,
  buildCreatePayload(profile: ProvisioningProfile) {
    if (profile.userDataContent) {
      const key = metadataKey(profile.userDataContent)
      const path = join(tmpdir(), `gnd-${key}-${profile.name}`)
      writeFileSync(path, profile.userDataContent)
      return { key, value: path }
    }
    const path = expandHome(profile.userData ?? "")
    if (!path || !existsSync(path)) {
      throw new Error(`boot config file not found: ${profile.userData ?? "(unset)"}`)
    }
    // read the first bytes to route it (startup-script vs cloud-init), inject the path itself
    return { key: metadataKey(readFileSync(path, "utf8")), value: path }
  },
}
