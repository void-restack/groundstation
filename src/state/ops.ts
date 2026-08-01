import { runUpdateAll } from "../adapters/ansible"
import { capabilities } from "../config"
import { logEvent, refreshFleet } from "./fleet"

let sweeping = false

export async function updateAll() {
  if (sweeping) return
  if (!capabilities.canUpdate) {
    logEvent({ server: null, level: "caution", message: "sweep needs an ansible playbook dir — settings [ , ] → ANSIBLE" })
    return
  }
  sweeping = true
  logEvent({ server: null, level: "info", message: "constellation sweep started" })
  const ok = await runUpdateAll((e) => {
    if (e.type === "result" && e.state === "failed") {
      logEvent({ server: e.host, level: "flare", message: `sweep: ${e.host} failed` })
    }
  }).catch(() => false)
  logEvent({
    server: null,
    level: ok ? "nominal" : "flare",
    message: ok ? "sweep complete" : "sweep failed",
  })
  await refreshFleet()
  sweeping = false
}
