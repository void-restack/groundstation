import { runUpdateAll } from "../adapters/ansible"
import { logEvent, refreshFleet } from "./fleet"

let sweeping = false

export async function updateAll() {
  if (sweeping) return
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
