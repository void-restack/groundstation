import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import pkg from "../package.json"
import { App } from "./App"
import { config, loadConfig } from "./config"
import { syncConfigStore } from "./state/config"
import { palette } from "./theme"

const args = process.argv.slice(2)

if (args.includes("--version") || args.includes("-v")) {
  console.log(`groundstation ${pkg.version}`)
} else if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "GROUNDSTATION — a terminal dashboard for your cloud fleet",
      "",
      "Usage:",
      "  gnd            open the dashboard (needs a gcloud login)",
      "  gnd serve      serve the dashboard over SSH",
      "  gnd --version  print the version",
      "  gnd --help     show this help",
      "",
      "Config: ~/.config/groundstation/config.json (or GND_* env vars).",
    ].join("\n"),
  )
} else {
  loadConfig()
  syncConfigStore()

  if (args.includes("serve")) {
    const { serve } = await import("./server")
    await serve(config.port)
  } else {
    const renderer = await createCliRenderer({
      exitOnCtrlC: true,
      targetFps: 30,
      backgroundColor: palette.bg,
    })
    createRoot(renderer).render(<App />)
  }
}
